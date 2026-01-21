import fs from 'fs';
import { error, fail } from '@sveltejs/kit';
import path from 'path';

const DB_PATH = path.resolve('./database.json');

/** @type {import('./$types').PageServerLoad} */
export function load({ params }) {
    if (!fs.existsSync(DB_PATH)) throw error(404, 'រកមិនឃើញឯកសារទិន្នន័យ');
    
    const content = fs.readFileSync(DB_PATH, 'utf-8');
    const dbData = JSON.parse(content || '[]');

    const allCustomers = Array.isArray(dbData) ? dbData : (dbData.customers || []);
    const customer = allCustomers.find(c => c.customer_id === params.id);

    if (!customer) throw error(404, 'រកមិនឃើញអតិថិជន');

    const oldStatusMap = {};
    if (customer.repayment_schedule) {
        customer.repayment_schedule.forEach(item => {
            oldStatusMap[item.no] = item.status;
        });
    }

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

    return { 
        customer: {
            ...customer,
            repayment_schedule: newSchedule
        } 
    };
}

/** @type {import('./$types').Actions} */
export const actions = {
    updateStatus: async ({ request, params }) => {
        try {
            const data = await request.formData();
            const scheduleJSON = data.get('schedule');
            if (!scheduleJSON) return fail(400);

            const content = fs.readFileSync(DB_PATH, 'utf-8');
            let dbData = JSON.parse(content || '{"customers":[]}');
            let customers = Array.isArray(dbData) ? dbData : (dbData.customers || []);
            let history = dbData.customer_late_history || [];

            const index = customers.findIndex(c => c.customer_id === params.id);
            if (index !== -1) {
                customers[index].repayment_schedule = JSON.parse(scheduleJSON);
                const finalDb = { customers, customer_late_history: history };
                fs.writeFileSync(DB_PATH, JSON.stringify(finalDb, null, 2));
                return { success: true };
            }
            return fail(404);
        } catch (err) {
            return fail(500);
        }
    },

    // ✅ Action ថ្មីសម្រាប់ចុច Approve និងរក្សាទុកទិន្នន័យតារាងទាំងអស់
    approve: async ({ request, params }) => {
        try {
            const formData = await request.formData();
            const fullScheduleJSON = formData.get('full_schedule'); // ទទួលទិន្នន័យតារាងពី Frontend

            if (!fullScheduleJSON) return fail(400, { message: "No schedule data provided" });

            const content = fs.readFileSync(DB_PATH, 'utf-8');
            let dbData = JSON.parse(content || '{"customers":[]}');
            let customers = Array.isArray(dbData) ? dbData : (dbData.customers || []);
            let history = dbData.customer_late_history || [];

            const index = customers.findIndex(c => c.customer_id === params.id);

            if (index !== -1) {
                // ១. រក្សាទុកតារាងបង់ប្រាក់ទាំងអស់ចូលក្នុង Database
                customers[index].repayment_schedule = JSON.parse(fullScheduleJSON);
                
                // ២. ប្តូរ Status ជាអ្នកដែលត្រូវបានអនុម័ត
                customers[index].is_approved = true;
                customers[index].approved_date = new Date().toISOString();

                const finalDb = { customers, customer_late_history: history };
                fs.writeFileSync(DB_PATH, JSON.stringify(finalDb, null, 2));
                
                return { success: true };
            }
            return fail(404);
        } catch (err) {
            console.error("Approve Error:", err);
            return fail(500);
        }
    }
};