const { db } = require('@vercel/postgres');
const fs = require('fs');

async function migrateData() {
  const client = await db.connect();

  try {
    // ១. អានទិន្នន័យពី database.json
    const rawData = fs.readFileSync('./database.json', 'utf8');
    const data = JSON.parse(rawData);
    const customers = data.customers;

    console.log(`កំពុងចាប់ផ្ដើមរុញទិន្នន័យអតិថិជនចំនួន ${customers.length} នាក់...`);

    for (const customer of customers) {
      // ២. បញ្ចូលទិន្នន័យទៅក្នុងតារាង customers
      await client.sql`
        INSERT INTO customers (
          customer_id, customer_name, customer_id_card, phone_number, address, 
          currency_type, loan_amount, interest_rate, loan_date, loan_term, 
          loan_type, collateral, status, is_approved, approved_date
        ) VALUES (
          ${customer.customer_id}, ${customer.customer_name}, ${customer.customer_id_card}, 
          ${customer.phone_number}, ${customer.address}, ${customer.currency_type}, 
          ${customer.loan_amount}, ${customer.interest_rate}, ${customer.loan_date}, 
          ${customer.loan_term}, ${customer.loan_type}, ${customer.collateral}, 
          ${customer.status}, ${customer.is_approved}, ${customer.approved_date}
        ) ON CONFLICT (customer_id) DO NOTHING;
      `;

      // ៣. បញ្ចូលទិន្នន័យទៅក្នុងតារាង repayment_schedules
      if (customer.repayment_schedule && customer.repayment_schedule.length > 0) {
        for (const schedule of customer.repayment_schedule) {
          await client.sql`
            INSERT INTO repayment_schedules (
              customer_id, no, due_date, beginning_balance, 
              pay_principal, pay_interest, total_pay, ending_balance, status
            ) VALUES (
              ${customer.customer_id}, ${schedule.no}, ${schedule.date}, 
              ${schedule.beginning_balance}, ${schedule.pay_principal}, 
              ${schedule.pay_interest}, ${schedule.total_pay}, 
              ${schedule.ending_balance}, ${schedule.status}
            );
          `;
        }
      }
      console.log(`✅ រួចរាល់សម្រាប់អតិថិជន៖ ${customer.customer_name}`);
    }

    console.log("🚀 ការរុញទិន្នន័យចូល Database ជោគជ័យទាំងស្រុង!");
  } catch (error) {
    console.error("❌ មានបញ្ហាក្នុងការរុញទិន្នន័យ៖", error);
  } finally {
    await client.release();
  }
}

migrateData();