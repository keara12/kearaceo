import { sql } from '@vercel/postgres';
import { error, fail } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
    const customerId = params.id;

    try {
        // ១. ទាញទិន្នន័យអតិថិជនពី Postgres
        const { rows: customers } = await sql`
            SELECT * FROM customers WHERE customer_id = ${customerId} LIMIT 1
        `;

        if (customers.length === 0) throw error(404, 'រកមិនឃើញអតិថិជន');
        const customer = customers[0];

        // ២. ទាញយកតារាងបង់ប្រាក់ដែលមានស្រាប់ក្នុង DB
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
                // ✅ ប្តូរឈ្មោះពី due_date មកជា date វិញ ដើម្បីឱ្យត្រូវជាមួយ Frontend Svelte របស់អ្នក
                date: payDate.toISOString().split('T')[0], 
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
        console.error("View Load Error:", err);
        throw error(500, "មានបញ្ហាបច្ចេកទេសក្នុងការទាញទិន្នន័យ");
    }
}

/** @type {import('./$types').Actions} */
export const actions = {
    approve: async ({ request, params }) => {
        try {
            const formData = await request.formData();
            const fullScheduleJSON = formData.get('full_schedule'); 

            if (!fullScheduleJSON) return fail(400, { message: "ខ្វះទិន្នន័យតារាងបង់ប្រាក់" });
            const schedule = JSON.parse(fullScheduleJSON);

            // ១. លុបទិន្នន័យចាស់ក្នុង repayment_schedules
            await sql`DELETE FROM repayment_schedules WHERE customer_id = ${params.id}`;

            // ២. បញ្ចូលតារាងថ្មីម្ដងមួយជួរ
            for (const item of schedule) {
                await sql`
                    INSERT INTO repayment_schedules (
                        customer_id, no, due_date, beginning_balance, 
                        pay_principal, pay_interest, total_pay, ending_balance, status
                    ) VALUES (
                        ${params.id}, ${item.no}, ${item.date}, 
                        ${item.beginning_balance}, ${item.pay_principal}, 
                        ${item.pay_interest}, ${item.total_pay}, ${item.ending_balance}, 
                        ${item.status}
                    )
                `;
            }

            // ៣. Update ស្ថានភាពអតិថិជន
            await sql`
                UPDATE customers 
                SET is_approved = true, approved_date = NOW() 
                WHERE customer_id = ${params.id}
            `;
            
            return { success: true };
        } catch (err) {
            console.error("Approve Action Error:", err);
            return fail(500, { message: "ការរក្សាទុកបរាជ័យ" });
        }
    }
};