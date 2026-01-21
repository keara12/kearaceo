import fs from 'fs';
import { error, fail } from '@sveltejs/kit';
import path from 'path';

const DB_PATH = path.resolve('./database.json');

export function load({ params }) {
    if (!fs.existsSync(DB_PATH)) throw error(404, 'រកមិនឃើញឯកសារទិន្នន័យ');
    
    const content = fs.readFileSync(DB_PATH, 'utf-8');
    const customers = JSON.parse(content || '[]');
    const customer = customers.find(c => c.customer_id === params.id);

    if (!customer) throw error(404, 'រកមិនឃើញអតិថិជន');

    // ១. ទាញយក Status ចាស់ៗទុកជាមុនសិន (បើយើងធ្លាប់ចុច Paid)
    // យើងប្រើ Map ដើម្បីទុក Status តាមលេខរៀង (No)
    const oldStatusMap = {};
    if (customer.repayment_schedule) {
        customer.repayment_schedule.forEach(item => {
            oldStatusMap[item.no] = item.status;
        });
    }

    // ២. គណនាបង្កើតតារាងថ្មីជានិច្ច ដើម្បីឱ្យស៊ីគ្នាជាមួយ ការកែប្រែថ្ងៃខែ ឬចំនួនខែ
    const totalPrincipal = parseFloat(customer.loan_amount) || 0; 
    const totalMonths = parseInt(customer.loan_term) || 0;
    const monthlyRate = (parseFloat(customer.interest_rate) || 0) / 100;
    const principalPerMonth = totalPrincipal / totalMonths;
    
    // ចាប់យកកាលបរិច្ឆេទថ្មី (ដែលទើបនឹង Edit)
    let startDate = new Date(customer.loan_date || '2026-01-16');

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
            // បើធ្លាប់មាន Status ចាស់ឱ្យប្រើរបស់ចាស់ បើអត់ទេឱ្យដាក់ Unpaid
            status: oldStatusMap[i] || "Unpaid"
        });
        currentBalance = remainingBalance;
    }

    // ៣. បញ្ជូនទិន្នន័យដែលទើបគណនាថ្មីស្រឡាងទៅឱ្យ Frontend
    return { 
        customer: {
            ...customer,
            repayment_schedule: newSchedule
        } 
    };
}

export const actions = {
    updateStatus: async ({ request, params }) => {
        try {
            const data = await request.formData();
            const scheduleJSON = data.get('schedule');
            
            if (!scheduleJSON) return fail(400);

            const content = fs.readFileSync(DB_PATH, 'utf-8');
            let customers = JSON.parse(content || '[]');
            const index = customers.findIndex(c => c.customer_id === params.id);

            if (index !== -1) {
                customers[index].repayment_schedule = JSON.parse(scheduleJSON);
                fs.writeFileSync(DB_PATH, JSON.stringify(customers, null, 2));
                return { success: true };
            }
            return fail(404);
        } catch (err) {
            return fail(500);
        }
    }
};