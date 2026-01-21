import fs from 'fs';
import path from 'path';

const DB_PATH = path.resolve('database.json'); 

export const load = async () => {
    try {
        if (!fs.existsSync(DB_PATH)) {
            return { late_history: [] };
        }

        const jsonData = fs.readFileSync(DB_PATH, 'utf-8');
        const db = JSON.parse(jsonData);
        const lateHistory = db.customer_late_history || [];

        lateHistory.sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at));

        return {
            late_history: JSON.parse(JSON.stringify(lateHistory))
        };
    } catch (err) {
        console.error("Error loading data:", err);
        return { late_history: [] };
    }
};

// --- បន្ថែម Actions សម្រាប់លុបទិន្នន័យ ---
export const actions = {
    deleteRecord: async ({ request }) => {
        const formData = await request.formData();
        const paymentId = formData.get('paymentId');

        try {
            const jsonData = fs.readFileSync(DB_PATH, 'utf-8');
            let db = JSON.parse(jsonData);

            // លុប Record តាម payment_id
            db.customer_late_history = db.customer_late_history.filter(h => h.payment_id !== paymentId);

            // រក្សាទុកចូលក្នុង File វិញ
            fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

            return { success: true };
        } catch (err) {
            console.error("Delete Error:", err);
            return { success: false };
        }
    }
};