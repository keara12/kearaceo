import { sql } from '@vercel/postgres';
import { fail, redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load() {
    try {
        // ១. ទាញទិន្នន័យអតិថិជនដែលមាន currency_type ជា "1" (រៀល) ពី Database 
        const { rows: allCustomers } = await sql`
            SELECT * FROM customers 
            WHERE currency_type = '1' 
            ORDER BY created_at DESC
        `;

        // ២. ទាញទិន្នន័យតារាងបង់ប្រាក់សម្រាប់អតិថិជនទាំងនោះ
        // ដើម្បីឱ្យទិន្នន័យមានទម្រង់ដូចមុន យើងត្រូវយក repayment_schedule ទៅដាក់ក្នុង customer ម្នាក់ៗ
        const customers = await Promise.all(allCustomers.map(async (customer) => {
            const { rows: schedule } = await sql`
                SELECT * FROM repayment_schedules 
                WHERE customer_id = ${customer.customer_id} 
                ORDER BY no ASC
            `;
            return {
                ...customer,
                repayment_schedule: schedule
            };
        }));

        // ៣. គណនាស្ថិតិ (Stats) ដូចកូដដើមរបស់អ្នក 
        const today = new Date();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();

        let totalLoanAmount = 0;
        let totalPaidInterest = 0;
        let currentMonthInterest = 0;

        customers.forEach(c => {
            totalLoanAmount += Number(c.loan_amount || 0);
            if (c.repayment_schedule) {
                c.repayment_schedule.forEach(row => {
                    if (row.status && row.status.toLowerCase() === "paid") {
                        const interest = Number(row.pay_interest || 0);
                        const rowDate = new Date(row.due_date);
                        totalPaidInterest += interest;
                        if (rowDate.getMonth() === currentMonth && rowDate.getFullYear() === currentYear) {
                            currentMonthInterest += interest;
                        }
                    }
                });
            }
        });

        return {
            customers,
            stats: {
                totalCount: customers.length,
                totalLoan: totalLoanAmount.toLocaleString(),
                totalPaidInterest: totalPaidInterest.toLocaleString(),
                currentMonthInterest: currentMonthInterest.toLocaleString()
            }
        };
    } catch (error) {
        console.error("Database Error:", error);
        return { customers: [], stats: { totalCount: 0, totalLoan: "0", totalPaidInterest: "0", currentMonthInterest: "0" } };
    }
}

/** @type {import('./$types').Actions} */
export const actions = {
    deleteCustomer: async ({ request }) => {
        const formData = await request.formData();
        const id = formData.get('id');

        try {
            // លុបតារាងបង់ប្រាក់មុន រួចចាំលុបអតិថិជន (Foreign Key constraint)
            await sql`DELETE FROM repayment_schedules WHERE customer_id = ${id}`;
            await sql`DELETE FROM customers WHERE customer_id = ${id}`;
        } catch (error) {
            console.error("Delete Error:", error);
            return fail(500, { message: "មិនអាចលុបទិន្នន័យបានទេ" });
        }

        throw redirect(303, '/customers');
    }
};