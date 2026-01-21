import fs from 'fs';
import { error, fail } from '@sveltejs/kit';
import path from 'path';

const DB_PATH = path.resolve('./database.json');

/** @type {import('./$types').PageServerLoad} */
export function load({ params }) {
    if (!fs.existsSync(DB_PATH)) throw error(404, 'រកមិនឃើញឯកសារទិន្នន័យ');
    
    const content = fs.readFileSync(DB_PATH, 'utf-8');
    const dbData = JSON.parse(content || '{"customers":[]}');
    
    const allCustomers = dbData.customers || [];
    const customer = allCustomers.find(c => c.customer_id === params.id);

    if (!customer) throw error(404, 'រកមិនឃើញអតិថិជន');

    if (!customer.repayment_schedule || customer.repayment_schedule.length === 0) {
        const totalPrincipal = parseFloat(customer.loan_amount) || 0; 
        const loanTermMonths = parseInt(customer.loan_term) || 0;
        const totalInstallments = loanTermMonths * 2; 
        
        const ratePerPeriod = ((parseFloat(customer.interest_rate) || 0) / 100);
        const principalPerPeriod = totalPrincipal / totalInstallments;
        
        let startDate = new Date(customer.loan_date || '2026-01-01');
        let newSchedule = [];
        let currentBalance = totalPrincipal;

        for (let i = 1; i <= totalInstallments; i++) {
            const interestThisTime = currentBalance * ratePerPeriod;
            const remainingBalance = currentBalance - principalPerPeriod;
            
            let payDate = new Date(startDate);
            payDate.setDate(startDate.getDate() + (i * 15));

            newSchedule.push({
                no: i,
                date: payDate.toISOString().split('T')[0],
                beginning_balance: Math.round(currentBalance),
                pay_principal: Math.round(principalPerPeriod),
                pay_interest: Math.round(interestThisTime),
                total_pay: Math.round(principalPerPeriod + interestThisTime),
                ending_balance: Math.round(remainingBalance > 0 ? remainingBalance : 0),
                status: "Unpaid"
            });
            currentBalance = remainingBalance;
        }
        customer.repayment_schedule = newSchedule;
    }

    return { 
        customer
    };
}

/** @type {import('./$types').Actions} */
export const actions = {
    updateStatus: async ({ request, params }) => {
        try {
            const data = await request.formData();
            const scheduleJSON = data.get('schedule');
            
            const content = fs.readFileSync(DB_PATH, 'utf-8');
            let dbData = JSON.parse(content || '{"customers":[]}');
            let customers = dbData.customers || [];

            const index = customers.findIndex(c => c.customer_id === params.id);
            if (index !== -1) {
                customers[index].repayment_schedule = JSON.parse(scheduleJSON);
                dbData.customers = customers;
                fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2));
                return { success: true };
            }
            return fail(404);
        } catch (err) {
            return fail(500);
        }
    },

    // Action ថ្មីសម្រាប់ ApproveSchedule
    approveSchedule: async ({ request, params }) => {
        try {
            const data = await request.formData();
            const scheduleJSON = data.get('schedule');
            
            const content = fs.readFileSync(DB_PATH, 'utf-8');
            let dbData = JSON.parse(content || '{"customers":[]}');
            let customers = dbData.customers || [];

            const index = customers.findIndex(c => c.customer_id === params.id);
            if (index !== -1) {
                // រក្សាទុក schedule ដែលបានផ្ញើមកចូលក្នុង Database ជាស្ថាពរ
                customers[index].repayment_schedule = JSON.parse(scheduleJSON);
                dbData.customers = customers;
                fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2));
                return { success: true };
            }
            return fail(404);
        } catch (err) {
            return fail(500);
        }
    }
};