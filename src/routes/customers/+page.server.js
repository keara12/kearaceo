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

            // ✅ កែសម្រួលចំណុចនេះ៖ ឆែកមើលថាតើទិន្នន័យជា Array ឬជា Object
            if (Array.isArray(dbData)) {
                // ប្រសិនបើជាទម្រង់ Array សុទ្ធ (ទម្រង់ដើម)
                allCustomers = dbData;
            } else if (dbData && dbData.customers) {
                // ប្រសិនបើជាទម្រង់ Object (ក្រោយពេលបង់ប្រាក់រួច) ត្រូវទាញយកពី key .customers
                allCustomers = dbData.customers;
            }
        } catch (e) { 
            console.error("Error reading database:", e);
            allCustomers = []; 
        }
    }

    // --- ច្រោះយកតែអតិថិជនណាដែលមាន currency_type ជា "1" (រៀល) ---
    // ប្រើងាយស្រួលជាមួយ String ឬ Number ដោយប្រើ ==
    const customers = allCustomers.filter(c => String(c.currency_type) === "1");

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
                // ឆែក Status "Paid" ឬ "paid" (Case-insensitive)
                if (row.status && row.status.toLowerCase() === "paid") {
                    const interest = Number(row.pay_interest || 0);
                    const rowDate = new Date(row.date);

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
}

/** @type {import('./$types').Actions} */
export const actions = {
    deleteCustomer: async ({ request }) => {
        const formData = await request.formData();
        const id = formData.get('id');

        if (fs.existsSync(DB_PATH)) {
            const content = fs.readFileSync(DB_PATH, 'utf-8');
            let dbData = JSON.parse(content || '[]');
            
            // ✅ កែសម្រួលការលុបឱ្យត្រូវតាមរចនាសម្ព័ន្ធថ្មី
            let customers = Array.isArray(dbData) ? dbData : (dbData.customers || []);
            let history = Array.isArray(dbData) ? [] : (dbData.customer_late_history || []);

            const updatedCustomers = customers.filter(c => c.customer_id !== id);

            // រក្សាទុកត្រឡប់ទៅវិញជាទម្រង់ Object ដើម្បីកុំឱ្យបាត់ History
            const finalData = {
                customers: updatedCustomers,
                customer_late_history: history
            };

            fs.writeFileSync(DB_PATH, JSON.stringify(finalData, null, 2));
        }
        // Redirect ទៅកាន់ទំព័របញ្ជីអតិថិជនវិញ
        throw redirect(303, '/customers');
    }
};