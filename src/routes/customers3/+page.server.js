import fs from 'fs';
import { redirect } from '@sveltejs/kit';

const DB_PATH = './database.json';

/** @type {import('./$types').PageServerLoad} */
export function load() {
    let allCustomers = [];
    if (fs.existsSync(DB_PATH)) {
        try {
            const content = fs.readFileSync(DB_PATH, 'utf-8');
            const dbData = JSON.parse(content || '[]');

            // ✅ បន្ថែមលក្ខខណ្ឌនេះ ដើម្បីការពារ Error "filter is not a function"
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
    // ឥឡូវ filter នឹងដំណើរការធម្មតាព្រោះ allCustomers គឺជា Array ជានិច្ច
    const customers = allCustomers.filter(c =>  (c.currency_type === "2" ? "1" : "3"));
    return { customers };
}

/** @type {import('./$types').Actions} */
export const actions = {
    payInstallment: async ({ request }) => {
        const formData = await request.formData();
        
        const customerId = formData.get('customerId');
        const date = formData.get('date');
        const penalty = formData.get('penalty');
        const interest = formData.get('interest');
        const grandTotal = formData.get('grandTotal');

        if (fs.existsSync(DB_PATH)) {
            try {
                const content = fs.readFileSync(DB_PATH, 'utf-8');
                let dbData = JSON.parse(content || '{"customers":[]}');

                // ✅ ទាញយក Array customers និង History ឱ្យបានត្រឹមត្រូវតាមរចនាសម្ព័ន្ធថ្មី
                let customers = Array.isArray(dbData) ? dbData : (dbData.customers || []);
                let history = dbData.customer_late_history || [];

                const customerIndex = customers.findIndex(c => c.customer_id === customerId);
                if (customerIndex !== -1) {
                    const schedule = customers[customerIndex].repayment_schedule;
                    const sessionIndex = schedule.findIndex(s => s.date === date);

                    if (sessionIndex !== -1) {
                        // ១. កែប្រែ Status ក្នុងតារាងមេ
                        customers[customerIndex].repayment_schedule[sessionIndex] = {
                            ...customers[customerIndex].repayment_schedule[sessionIndex],
                            status: "paid",
                            late_days: 0,
                            actual_penalty: Number(penalty),
                            actual_interest: Number(interest),
                            actual_paid_total: Number(grandTotal),
                            payment_recorded_at: new Date().toISOString()
                        };

                        // ២. បង្កើត Record ថ្មីសម្រាប់ Table History (Table ទី ២)
                        const historyRecord = {
                            payment_id: "PAY-" + Date.now(),
                            customer_id: customerId,
                            customer_name: customers[customerIndex].customer_name,
                            date: date,
                            paid_amount: Number(grandTotal),
                            penalty: Number(penalty),
                            recorded_at: new Date().toLocaleString('km-KH')
                        };

                        // ៣. រក្សាទុកជា Object ដែលមាន Key ច្បាស់លាស់ (ការពារ Error ទំព័រផ្សេង)
                        const finalDb = {
                            customers: customers,
                            customer_late_history: [...history, historyRecord]
                        };
                        
                        fs.writeFileSync(DB_PATH, JSON.stringify(finalDb, null, 2));
                    }
                }
            } catch (err) {
                console.error("Update error:", err);
            }
        }
        return { success: true };
    }
};