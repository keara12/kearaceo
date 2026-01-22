import { sql } from '@vercel/postgres';
import { error, fail } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load({ params }) {
    const customerId = params.id;
    try {
        const { rows: customers } = await sql`SELECT * FROM customers WHERE customer_id = ${customerId} LIMIT 1`;
        if (customers.length === 0) throw error(404, 'រកមិនឃើញអតិថិជន');
        const customer = customers[0];

        const { rows: existingSchedule } = await sql`
            SELECT * FROM repayment_schedules WHERE customer_id = ${customerId} ORDER BY no ASC
        `;

        const oldStatusMap = {};
        existingSchedule.forEach(item => {
            oldStatusMap[item.no] = item.status;
        });

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

        return { customer: { ...customer, repayment_schedule: newSchedule } };
    } catch (err) {
        throw error(500, "Error loading data");
    }
}

/** @type {import('./$types').Actions} */
export const actions = {
    // ✅ Action សម្រាប់ចុច Approve
    approve: async ({ request, params }) => {
        const formData = await request.formData();
        const fullScheduleJSON = formData.get('full_schedule'); 

        if (!fullScheduleJSON) return fail(400);
        const schedule = JSON.parse(fullScheduleJSON);

        try {
            await sql`DELETE FROM repayment_schedules WHERE customer_id = ${params.id}`;

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

            await sql`UPDATE customers SET is_approved = true, approved_date = NOW() WHERE customer_id = ${params.id}`;
            return { success: true };
        } catch (err) {
            console.error(err);
            return fail(500);
        }
    },

    // ✅ Action សម្រាប់ចុចប្តូរ Status (Paid/Unpaid)
    updateStatus: async ({ request, params }) => {
        const formData = await request.formData();
        const scheduleJSON = formData.get('schedule'); // ត្រូវឱ្យស៊ីគ្នាជាមួយ Frontend

        if (!scheduleJSON) return fail(400);
        const schedule = JSON.parse(scheduleJSON);

        try {
            // លុបចាស់ បញ្ចូលថ្មី (ដើម្បី Update ស្ថានភាពបង់ប្រាក់)
            await sql`DELETE FROM repayment_schedules WHERE customer_id = ${params.id}`;

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
            return { success: true };
        } catch (err) {
            console.error(err);
            return fail(500);
        }
    }
};