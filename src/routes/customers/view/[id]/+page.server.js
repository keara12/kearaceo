import { sql } from '@vercel/postgres';
import { error, fail } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
    const customerId = params.id;

    try {
        // ១. ទាញទិន្នន័យអតិថិជនពី Table customers
        const { rows: customers } = await sql`
            SELECT * FROM customers WHERE customer_id = ${customerId} LIMIT 1
        `;

        if (customers.length === 0) throw error(404, 'រកមិនឃើញអតិថិជន');
        const customer = customers[0];

        // ២. ទាញយកតារាងបង់ប្រាក់ពី Table repayment_schedules (បើមាន)
        const { rows: existingSchedule } = await sql`
            SELECT * FROM repayment_schedules 
            WHERE customer_id = ${customerId} 
            ORDER BY no ASC
        `;

        const oldStatusMap = {};
        existingSchedule.forEach(item => {
            oldStatusMap[item.no] = item.status;
        });

        // ៣. គណនាតារាងបង់ប្រាក់ (Logic ដើមរបស់អ្នក)
        const totalPrincipal = parseFloat(customer.loan_amount) || 0; 
        const totalMonths = parseInt(customer.loan_term) || 0;
        const monthlyRate = (parseFloat(customer.interest_rate) || 0) / 100;
        const principalPerMonth = totalPrincipal / totalMonths;
        
        let startDate = new Date(customer.loan_date);
        let newSchedule = [];
        let currentBalance = totalPrincipal;

        for (let i = 1; i <= totalMonths; i++) {
            const interestThisMonth = currentBalance * monthlyRate;
            const remainingBalance = currentBalance - principalPerMonth;
            
            let payDate = new Date(startDate);
            payDate.setMonth(startDate.getMonth() + i);

            newSchedule.push({
                no: i,
                due_date: payDate.toISOString().split('T')[0], // ប្តូរឈ្មោះឱ្យត្រូវតាម Table
                beginning_balance: Math.round(currentBalance),
                pay_principal: Math.round(principalPerMonth),
                pay_interest: Math.round(interestThisMonth),
                total_pay: Math.round(principalPerMonth + interestThisMonth),
                ending_balance: Math.round(remainingBalance > 0 ? remainingBalance : 0),
                status: oldStatusMap[i] || "Unpaid"
            });
            currentBalance = remainingBalance;
        }

        return { 
            customer: {
                ...customer,
                repayment_schedule: newSchedule
            } 
        };
    } catch (err) {
        console.error("Database Error:", err);
        throw error(500, "មានបញ្ហាក្នុងការទាញទិន្នន័យ");
    }
}

/** @type {import('./$types').Actions} */
export const actions = {
    // ✅ Action សម្រាប់ចុច Approve និងរក្សាទុកតារាងបង់ប្រាក់ចូល Database
    approve: async ({ request, params }) => {
        try {
            const formData = await request.formData();
            const fullScheduleJSON = formData.get('full_schedule'); 

            if (!fullScheduleJSON) return fail(400, { message: "No schedule data provided" });
            const schedule = JSON.parse(fullScheduleJSON);

            // ១. លុបតារាងចាស់ចោលសិន (បើមាន) ដើម្បីកុំឱ្យជាន់គ្នា
            await sql`DELETE FROM repayment_schedules WHERE customer_id = ${params.id}`;

            // ២. បញ្ចូលតារាងបង់ប្រាក់ថ្មីចូលទៅក្នុង Table repayment_schedules
            // យើងប្រើ loop ដើម្បីបញ្ចូលម្ដងមួយជួរ
            for (const item of schedule) {
                await sql`
                    INSERT INTO repayment_schedules (
                        customer_id, no, due_date, beginning_balance, 
                        pay_principal, pay_interest, total_pay, ending_balance, status
                    ) VALUES (
                        ${params.id}, ${item.no}, ${item.due_date || item.date}, 
                        ${item.beginning_balance}, ${item.pay_principal}, 
                        ${item.pay_interest}, ${item.total_pay}, ${item.ending_balance}, 
                        ${item.status}
                    )
                `;
            }

            // ៣. ប្តូរ Status ក្នុង Table customers ជាអ្នកដែលត្រូវបានអនុម័ត
            await sql`
                UPDATE customers 
                SET is_approved = true, approved_date = NOW() 
                WHERE customer_id = ${params.id}
            `;
            
            return { success: true };
        } catch (err) {
            console.error("Approve Error:", err);
            return fail(500);
        }
    }
};