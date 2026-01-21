import fs from 'fs';
import { fail } from '@sveltejs/kit';

const DB_PATH = './database.json';

// មុខងារជំនួយសម្រាប់ទាញយកទិន្នន័យអតិថិជនទាំងអស់ (Array)
function getAllCustomers() {
    if (fs.existsSync(DB_PATH)) {
        try {
            const content = fs.readFileSync(DB_PATH, 'utf-8');
            const dbData = JSON.parse(content || '[]');
            // ✅ បើជា Object យកពី Key .customers បើជា Array យកផ្ទាល់
            return Array.isArray(dbData) ? dbData : (dbData.customers || []);
        } catch (e) {
            return [];
        }
    }
    return [];
}

// មុខងារបង្កើត ID បន្ទាប់
function generateNextId() {
    const entries = getAllCustomers();
    if (entries.length === 0) {
        return "CRS000001";
    }

    const lastId = entries[entries.length - 1].customer_id;
    const lastNumber = parseInt(lastId.replace("CRS", ""));
    const nextNumber = lastNumber + 1;
    
    return "CRS" + nextNumber.toString().padStart(6, '0');
}

/** @type {import('./$types').PageServerLoad} */
export function load() {
    return {
        nextId: generateNextId()
    };
}

/** @type {import('./$types').Actions} */
export const actions = {
    default: async ({ request }) => {
        const data = await request.formData();
        
        const newEntry = {
            customer_id: data.get('customer_id'), 
            customer_name: data.get('customer_name'),
            customer_id_card: data.get('customer_id_card'),
            phone_number: data.get('phone_number'),
            address: data.get('address_text'), 
            currency_type: data.get('currency_type'),
            loan_amount: Number(data.get('loan_amount')), // ប្តូរទៅជាលេខ
            interest_rate: Number(data.get('interest_rate')), // ប្តូរទៅជាលេខ
            loan_date: data.get('loan_date'),
            loan_term: Number(data.get('loan_term')), // ប្តូរទៅជាលេខ
            loan_type: data.get('loan_type'),
            collateral: data.get('collateral'),
            createdAt: new Date().toISOString(),
            repayment_schedule: [] // បន្ថែម Array ទទេសម្រាប់តារាងបង់ប្រាក់
        };

        try {
            let dbData = { customers: [], customer_late_history: [] };
            
            if (fs.existsSync(DB_PATH)) {
                const content = fs.readFileSync(DB_PATH, 'utf-8');
                const parsed = JSON.parse(content || '{}');
                
                // ✅ រក្សាទុកទិន្នន័យចាស់ៗ (ទាំង Customers និង History)
                if (Array.isArray(parsed)) {
                    dbData.customers = parsed;
                } else {
                    dbData.customers = parsed.customers || [];
                    dbData.customer_late_history = parsed.customer_late_history || [];
                }
            }

            // បន្ថែមអតិថិជនថ្មីចូលក្នុង Array customers
            dbData.customers.push(newEntry);

            // ✅ រក្សាទុកជា Object ជានិច្ច ដើម្បីការពារ Error ទំព័រផ្សេងៗ
            fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2));

            return { success: true };
        } catch (err) {
            console.error("Save Error:", err);
            return fail(500, { error: "Failed to save data" });
        }
    }
};