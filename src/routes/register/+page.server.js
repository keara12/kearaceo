import { sql } from '@vercel/postgres';
import { fail, redirect } from '@sveltejs/kit';

/** @type {import('./$types').PageServerLoad} */
export async function load() {
    try {
        // ១. ទាញយក ID ចុងក្រោយគេបង្អស់ដើម្បីបង្កើត ID ថ្មី (ស្វ័យប្រវត្តិ)
        const { rows } = await sql`
            SELECT customer_id FROM customers 
            ORDER BY created_at DESC LIMIT 1
        `;

        let nextId = "CRS000001";
        if (rows.length > 0) {
            const lastId = rows[0].customer_id;
            const lastNumber = parseInt(lastId.replace("CRS", ""));
            const nextNumber = lastNumber + 1;
            nextId = "CRS" + nextNumber.toString().padStart(6, '0');
        }

        return { nextId };
    } catch (error) {
        console.error("Error fetching next ID:", error);
        return { nextId: "CRS000001" };
    }
}

/** @type {import('./$types').Actions} */
export const actions = {
    default: async ({ request }) => {
        const data = await request.formData();
        
        // ២. ចាប់យកទិន្នន័យពី Form
        const customer_id = data.get('customer_id');
        const customer_name = data.get('customer_name');
        const customer_id_card = data.get('customer_id_card');
        const phone_number = data.get('phone_number');
        const address = data.get('address_text');
        const currency_type = data.get('currency_type');
        const loan_amount = Number(data.get('loan_amount'));
        const interest_rate = Number(data.get('interest_rate'));
        const loan_date = data.get('loan_date');
        const loan_term = Number(data.get('loan_term'));
        const loan_type = data.get('loan_type');
        const collateral = data.get('collateral');

        try {
            // ៣. បញ្ចូលទិន្នន័យទៅក្នុង Table 'customers'
            // កូដនេះប្រើឈ្មោះ Column ដូចគ្នានឹង SQL ដែលអ្នកបានផ្ញើមក
            await sql`
                INSERT INTO customers (
                    customer_id, 
                    customer_name, 
                    customer_id_card, 
                    phone_number, 
                    address, 
                    currency_type, 
                    loan_amount, 
                    interest_rate, 
                    loan_date, 
                    loan_term, 
                    loan_type, 
                    collateral, 
                    status, 
                    is_approved,
                    created_at
                ) VALUES (
                    ${customer_id}, 
                    ${customer_name}, 
                    ${customer_id_card}, 
                    ${phone_number}, 
                    ${address}, 
                    ${currency_type}, 
                    ${loan_amount}, 
                    ${interest_rate}, 
                    ${loan_date}, 
                    ${loan_term}, 
                    ${loan_type}, 
                    ${collateral}, 
                    'Pending', 
                    false,
                    NOW()
                )
            `;

        } catch (err) {
            console.error("Database Save Error:", err);
            return fail(500, { error: "មិនអាចរក្សាទុកទិន្នន័យចូល Database បានទេ" });
        }

        // ៤. បើជោគជ័យ បញ្ជូនទៅកាន់ទំព័របញ្ជីអតិថិជន
        throw redirect(303, '/customers');
    }
};