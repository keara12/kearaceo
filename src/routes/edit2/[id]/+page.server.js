import fs from 'fs';
import { fail, redirect } from '@sveltejs/kit';

const DB_PATH = './database.json';

// Function សម្រាប់គណនាតារាងបង់ប្រាក់ឡើងវិញ (១៥ ថ្ងៃម្ដង)
function generateRepaymentSchedule(amount, term, interestRate, startDate) {
    let schedule = [];
    let remainingBalance = parseFloat(amount);
    const totalInstallments = term * 2; // បង់ ១៥ ថ្ងៃម្ដង
    const monthlyPrincipal = Math.round(remainingBalance / totalInstallments);
    const start = new Date(startDate);

    const ratePerPeriod = (interestRate / 100) / 2;

    for (let i = 1; i <= totalInstallments; i++) {
        const payInterest = Math.round(remainingBalance * ratePerPeriod);
        const totalPay = monthlyPrincipal + payInterest;
        const endingBalance = i === totalInstallments ? 0 : remainingBalance - monthlyPrincipal;

        let paymentDate = new Date(start);
        paymentDate.setDate(start.getDate() + (i * 15));

        schedule.push({
            no: i,
            date: paymentDate.toISOString().split('T')[0],
            beginning_balance: remainingBalance,
            pay_principal: monthlyPrincipal,
            pay_interest: payInterest,
            total_pay: totalPay,
            ending_balance: endingBalance > 0 ? endingBalance : 0,
            status: "Unpaid"
        });
        remainingBalance = endingBalance;
    }
    return schedule;
}

/** @type {import('./$types').PageServerLoad} */
export function load({ params }) {
    const id = params.id;
    let allCustomers = [];

    if (fs.existsSync(DB_PATH)) {
        const content = fs.readFileSync(DB_PATH, 'utf-8');
        const dbData = JSON.parse(content || '{"customers":[]}');
        // ✅ កែសម្រួល៖ ទាញយកពី dbData.customers
        allCustomers = Array.isArray(dbData) ? dbData : (dbData.customers || []);
    }

    const customer = allCustomers.find(c => c.customer_id === id);
    if (!customer) throw redirect(302, '/customers2');
    
    return { customer };
}

/** @type {import('./$types').Actions} */
export const actions = {
    default: async ({ request, params }) => {
        const data = await request.formData();
        const id = params.id;

        const loan_amount = parseFloat(data.get('loan_amount'));
        const loan_term = parseInt(data.get('loan_term'));
        const interest_rate = parseFloat(data.get('interest_rate'));
        const loan_date = data.get('loan_date');

        if (fs.existsSync(DB_PATH)) {
            const content = fs.readFileSync(DB_PATH, 'utf-8');
            let dbData = JSON.parse(content || '{"customers":[]}');
            
            // ✅ កែសម្រួល៖ បំបែក customers និង history ចេញពីគ្នា
            let customers = Array.isArray(dbData) ? dbData : (dbData.customers || []);
            let history = dbData.customer_late_history || [];

            const index = customers.findIndex(c => c.customer_id === id);

            if (index !== -1) {
                const newSchedule = generateRepaymentSchedule(loan_amount, loan_term, interest_rate, loan_date);

                customers[index] = {
                    ...customers[index],
                    customer_name: data.get('customer_name'),
                    customer_id_card: data.get('customer_id_card'),
                    phone_number: data.get('phone_number'),
                    loan_date: loan_date,
                    address: data.get('address'),
                    loan_amount: loan_amount,
                    interest_rate: interest_rate,
                    loan_term: loan_term,
                    loan_type: data.get('loan_type'),
                    collateral: data.get('collateral'),
                    repayment_schedule: newSchedule
                };

                // ✅ កែសម្រួល៖ រក្សាទុកជាទម្រង់ Object ដើមវិញ
                const finalDb = {
                    customers: customers,
                    customer_late_history: history
                };

                fs.writeFileSync(DB_PATH, JSON.stringify(finalDb, null, 2));
                throw redirect(303, '/customers2');
            }
        }
        return fail(404, { error: "រកមិនឃើញអតិថិជន" });
    }
};