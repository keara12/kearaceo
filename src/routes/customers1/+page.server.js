import fs from 'fs';
import { fail, redirect } from '@sveltejs/kit';

const DB_PATH = './database.json';

/** @type {import('./$types').PageServerLoad} */
export function load() {
    let allCustomers = [];
    if (fs.existsSync(DB_PATH)) {
        try {
            const content = fs.readFileSync(DB_PATH, 'utf-8');
            const dbData = JSON.parse(content || '[]');

            // ✅ ដំណោះស្រាយ៖ ឆែកមើលរចនាសម្ព័ន្ធទិន្នន័យ (Array ឬ Object)
            // បើជា Object យកពី Key .customers បើជា Array យកផ្ទាល់
            if (Array.isArray(dbData)) {
                allCustomers = dbData;
            } else if (dbData && dbData.customers) {
                allCustomers = dbData.customers;
            }
        } catch (e) { 
            console.error("Error reading database:", e);
            allCustomers = []; 
        }
    }

    // --- ច្រោះយកតែអតិថិជនណាដែលមាន currency_type ជា "2" (ដុល្លារ) ---
    const customers = allCustomers.filter(c => String(c.currency_type) === "2");

    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    let totalLoanAmount = 0;
    let totalPaidInterest = 0;   
    let currentMonthInterest = 0; 

    customers.forEach(c => {
        totalLoanAmount += Number(c.loan_amount || 0);

        if (c.repayment_schedule && Array.isArray(c.repayment_schedule)) {
            c.repayment_schedule.forEach(row => {
                // ✅ ឆែក Status "Paid" ឬ "paid" ឱ្យបានត្រឹមត្រូវ
                if (row.status && row.status.toLowerCase() === "paid") {
                    const interest = Number(row.pay_interest || 0);
                    const rowDate = new Date(row.date);

                    // ១. បូកបញ្ចូលការប្រាក់បង់រួចសរុប
                    totalPaidInterest += interest;

                    // ២. បូកបញ្ចូលការប្រាក់បង់រួចក្នុងខែបច្ចុប្បន្ន
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
}

/** @type {import('./$types').Actions} */
export const actions = {
    deleteCustomer: async ({ request }) => {
        const formData = await request.formData();
        const id = formData.get('id');

        if (fs.existsSync(DB_PATH)) {
            try {
                const content = fs.readFileSync(DB_PATH, 'utf-8');
                let dbData = JSON.parse(content || '{"customers":[]}');
                
                // ✅ បែងចែកទិន្នន័យឱ្យដាច់ពីគ្នា ដើម្បីកុំឱ្យបាត់ History ពេលលុប Customer
                let customers = Array.isArray(dbData) ? dbData : (dbData.customers || []);
                let history = dbData.customer_late_history || [];

                // ច្រោះលុបអតិថិជនចេញពី Array
                const updatedCustomers = customers.filter(c => c.customer_id !== id);

                // ✅ រក្សារចនាសម្ព័ន្ធ Object ជានិច្ចសម្រាប់ការរក្សាទុក
                const finalDb = {
                    customers: updatedCustomers,
                    customer_late_history: history
                };

                fs.writeFileSync(DB_PATH, JSON.stringify(finalDb, null, 2));
            } catch (err) {
                console.error("Delete error:", err);
            }
        }
        // Redirect ត្រឡប់ទៅទំព័របញ្ជីអតិថិជន
        throw redirect(303, '/customers');
    }
};