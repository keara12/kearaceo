import fs from 'fs';
const DB_PATH = './database.json';

/** @type {import('./$types').PageServerLoad} */
export function load() {
    let customers = [];
    if (fs.existsSync(DB_PATH)) {
        try {
            const content = fs.readFileSync(DB_PATH, 'utf-8');
            const dbData = JSON.parse(content || '{"customers": []}');
            customers = Array.isArray(dbData) ? dbData : (dbData.customers || []);
        } catch (e) { console.error("Error loading database:", e); }
    }
    return { customers };
}

/** @type {import('./$types').Actions} */
export const actions = {
    payInstallment: async ({ request }) => {
        const formData = await request.formData();
        
        // ចាប់យកតម្លៃដែលផ្ញើមកពី Frontend
        const customerId = formData.get('customerId');
        const late = Number(formData.get('late') || 0);
        const date = formData.get('date');
        const penalty = Number(formData.get('penalty') || 0);
        const interest = Number(formData.get('interest') || 0);
        const principal = Number(formData.get('principal') || 0);
        const grandTotal = Number(formData.get('grandTotal') || 0);
        const currency = formData.get('currency');

        if (fs.existsSync(DB_PATH)) {
            const content = fs.readFileSync(DB_PATH, 'utf-8');
            let db = JSON.parse(content);
            let customers = db.customers || [];
            let history = db.customer_late_history || [];

            const cIndex = customers.findIndex(c => c.customer_id === customerId);
            if (cIndex !== -1) {
                // ១. កែប្រែ Status ទៅជា Paid
                const sIndex = customers[cIndex].repayment_schedule.findIndex(s => s.date === date);
                if (sIndex !== -1) {
                    customers[cIndex].repayment_schedule[sIndex].status = "Paid";
                }

                // ២. បង្កើត Record ថ្មីសម្រាប់ History
                const newRecord = {
                    payment_id: "PAY-" + Date.now(),
                    customer_id: customerId,
                    customer_name: customers[cIndex].customer_name,
                    late: late,
                    scheduled_date: date,
                    paid_at: new Date().toISOString(),
                    principal: principal,
                    interest: interest,
                    penalty: penalty,
                    total_paid: grandTotal,
                    currency: currency
                };

                // ៣. រៀបចំរក្សាទុកចូល File វិញ
                let finalDb = {
                    customers: customers,
                    customer_late_history: [...history, newRecord]
                };
                fs.writeFileSync(DB_PATH, JSON.stringify(finalDb, null, 2));
            }
        }
        return { success: true };
    }
};