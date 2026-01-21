<script>
    import { invalidateAll } from '$app/navigation';
    import { fade } from 'svelte/transition';

    let { data } = $props();
    
    // រក្សាទុក Logic ដើម៖ Schedule ប្តូរតាម data.customer.repayment_schedule
    let schedule = $derived(data.customer.repayment_schedule);

    async function toggleStatus(index) {
        let updatedSchedule = [...schedule];
        updatedSchedule[index].status = updatedSchedule[index].status === "Unpaid" ? "Paid" : "Unpaid";

        const formData = new FormData();
        formData.append('schedule', JSON.stringify(updatedSchedule));

        try {
            const response = await fetch('?/updateStatus', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                // Update UI តាមរយៈ Server
                await invalidateAll();
            } else {
                throw new Error();
            }
        } catch (err) {
            alert("មិនអាចរក្សាទុកបានទេ! សូមព្យាយាមម្តងទៀត។");
        }
    }

    // គណនាសរុប (Logic ដើម)
    let grandTotal = $derived(schedule.reduce((acc, row) => acc + (row.total_pay || row.total || 0), 0));
</script>

<div class="main-wrapper">
    <div class="header-actions no-print">
        <button onclick={() => window.history.back()} class="btn-back">
            <span class="icon">←</span> ត្រឡប់ក្រោយ
        </button>
        <button onclick={() => window.print()} class="btn-print">
            <span class="icon">⎙</span> បោះពុម្ពតារាង
        </button>
    </div>

    <div class="schedule-paper">
        <div class="bank-header">
            <div class="logo-area">
                <div class="bank-logo">TH</div>
                <div class="bank-name">
                    <h2>ក្រុមហ៊ុន ទៀវ ហៃ អុិចប្រេស ឡូន ឯ.ក</h2>
                    <p>Teav Hay Express Loan Co., Ltd</p>
                </div>
            </div>
            <div class="report-title">
                <h1>តារាងបង់ប្រាក់សងត្រឡប់</h1>
                <small style="color: #64748b;"></small>
            </div>
        </div>

        <div class="info-section">
            <div class="info-column">
                <div class="info-row"><span>ឈ្មោះអតិថិជន / Name:</span> <strong>{data.customer.customer_name}</strong></div>
                <div class="info-row"><span>លេខសម្គាល់ / ID:</span> <strong>#{data.customer.customer_id}</strong></div>
                <div class="info-row"><span>លេខទូរស័ព្ទ / Phone:</span> <strong>{data.customer.phone_number}</strong></div>
                <div class="info-row"><span>អាសយដ្ឋាន / Address:</span> <strong>{data.customer.address || 'N/A'}</strong></div>
            </div>
            <div class="info-column">
                <div class="info-row"><span>ចំនួនកម្ចី / Principal:</span> <strong class="currency">{Number(data.customer.loan_amount).toLocaleString()} ៛</strong></div>
                <div class="info-row"><span>ការប្រាក់ / Interest:</span> <strong>{data.customer.interest_rate}% / ខែ</strong></div>
                <div class="info-row"><span>រយៈពេល / Term:</span> <strong>{data.customer.loan_term} ខែ</strong></div>
                <div class="info-row"><span>ថ្ងៃបញ្ចេញប្រាក់ / Date:</span> <strong>{data.customer.loan_date}</strong></div>
            </div>
        </div>

        <table class="schedule-table">
            <thead>
                <tr>
                    <th>ល.រ<br><small>No</small></th>
                    <th>កាលបរិច្ឆេទបង់<br><small>Payment Date</small></th>
                    <th>សមតុល្យដើមគ្រា<br><small>Opening Balance</small></th>
                    <th>បង់ប្រាក់ដើម<br><small>Principal</small></th>
                    <th>បង់ការប្រាក់<br><small>Interest</small></th>
                    <th>សរុបត្រូវបង់<br><small>Total Payment</small></th>
                    <th>សមតុល្យចុងគ្រា<br><small>Remaining</small></th>
                    <th class="no-print">ស្ថានភាព<br><small>Status</small></th>
                </tr>
            </thead>
            <tbody>
                {#each schedule as row, i}
                    <tr>
                        <td class="text-center">{row.no}</td>
                        <td class="text-center">{row.date}</td>
                        <td class="text-right">{(row.beginning_balance || row.principal_bal || 0).toLocaleString()}៛</td>
                        <td class="text-right">{(row.pay_principal || 0).toLocaleString()}៛</td>
                        <td class="text-right">{(row.pay_interest || 0).toLocaleString()}៛</td>
                        <td class="text-right bold-text">{(row.total_pay || row.total || 0).toLocaleString()}៛</td>
                        <td class="text-right">{(row.ending_balance || row.remaining || 0).toLocaleString()}៛</td>
                        <td class="no-print">
                            <button 
                                class="status-btn {row.status.toLowerCase()}" 
                                onclick={() => toggleStatus(i)}
                            >
                                {row.status === 'Paid' ? 'បង់រួច' : 'Unpaid'}
                            </button>
                        </td>
                    </tr>
                {/each}
                <tr class="grand-total-row">
                    <td colspan="5" class="text-right"><strong>សរុបប្រាក់ត្រូវបង់សរុប:</strong></td>
                    <td colspan="3" class="text-left"><strong>{grandTotal.toLocaleString()} ៛</strong></td>
                </tr>
            </tbody>
        </table>

        <div class="signature-section">
            <div class="sig-box">
                <p>ស្នាមមេដៃអតិថិជន</p>
                <span>Customer's Thumbprint</span>
                <div class="sig-space"></div>
            </div>
            <div class="sig-box">
                <p>អ្នករៀបចំ</p>
                <span>Prepared By</span>
                <div class="sig-space"></div>
            </div>
            <div class="sig-box">
                <p>អ្នកអនុម័ត</p>
                <span>Approved By</span>
                <div class="sig-space"></div>
            </div>
        </div>

        <div class="footer-note">
            <p>* សូមរក្សាប័ណ្ណនេះឱ្យបានល្អ ដើម្បីតាមដានការបង់ប្រាក់របស់លោកអ្នក។</p>
        </div>
    </div>
</div>

<style>
    @import url('https://fonts.googleapis.com/css2?family=Khmer+OS+Battambang&display=swap');

    :global(body) { background: #e0e0e0; margin: 0; }

    .main-wrapper { padding: 40px 20px; font-family: 'Khmer OS Battambang', sans-serif; }

    .header-actions { max-width: 1000px; margin: 0 auto 20px auto; display: flex; gap: 10px; }
    .btn-back, .btn-print { 
        padding: 10px 20px; border-radius: 6px; border: none; cursor: pointer; font-weight: bold;
        display: flex; align-items: center; gap: 8px; font-family: 'Khmer OS Battambang';
    }
    .btn-back { background: #64748b; color: white; }
    .btn-print { background: #1a3a8a; color: white; }

    .schedule-paper { 
        background: white; width: 210mm; min-height: 297mm; margin: auto; 
        padding: 40px; box-shadow: 0 0 20px rgba(0,0,0,0.2); box-sizing: border-box; 
    }

    .bank-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #1a3a8a; padding-bottom: 15px; }
    .logo-area { display: flex; align-items: center; gap: 15px; }
    .bank-logo { 
        background: #1a3a8a; color: white; width: 50px; height: 50px; 
        display: flex; align-items: center; justify-content: center; 
        font-weight: bold; border-radius: 8px; font-size: 1.5rem;
    }
    .bank-name h2 { margin: 0; font-size: 1.1rem; color: #1a3a8a; }
    .bank-name p { margin: 0; font-size: 0.8rem; color: #64748b; }
    .report-title { text-align: right; }
    .report-title h1 { margin: 0; font-size: 1.4rem; color: #1a3a8a; }
    .report-title p { margin: 0; font-size: 0.8rem; color: #64748b; }

    .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin: 25px 0; }
    .info-row { display: flex; justify-content: space-between; font-size: 0.85rem; padding: 4px 0; border-bottom: 1px dashed #eee; }
    .info-row span { color: #64748b; }
    .currency { color: #1a3a8a; }

    .schedule-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    .schedule-table th { background: #f8fafc; color: #1a3a8a; border: 1px solid #cbd5e1; padding: 10px 5px; font-size: 0.75rem; text-transform: uppercase; }
    .schedule-table td { border: 1px solid #cbd5e1; padding: 8px; font-size: 0.8rem; color: #334155; }
    
    .grand-total-row { background: #f8fafc; font-weight: bold; }
    
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .text-left { text-align: left; }
    .bold-text { font-weight: bold; color: #1a3a8a; }
    tr:nth-child(even) { background-color: #fcfcfc; }

    .status-btn { border: none; padding: 3px 8px; border-radius: 4px; color: white; cursor: pointer; font-size: 0.7rem; font-family: 'Khmer OS Battambang'; width: 100%; }
    .unpaid { background: #ef4444; }
    .paid { background: #10b981; }

    .signature-section { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-top: 50px; text-align: center; }
    .sig-box p { margin: 0; font-size: 0.85rem; font-weight: bold; }
    .sig-box span { font-size: 0.75rem; color: #64748b; }
    .sig-space { margin-top: 60px; border-bottom: 1px solid #333; width: 80%; margin-left: auto; margin-right: auto; }

    .footer-note { margin-top: 30px; border-top: 1px solid #eee; padding-top: 10px; font-size: 0.75rem; color: #94a3b8; font-style: italic; }
.header-actions { 
    max-width:800px; 
    margin: 0 auto 20px auto; 
    display: flex; 
    justify-content: flex-end; /* រុញប៊ូតុងទៅខាងស្ដាំបង្អស់ */
    gap: 10px; 
}
    @media print {
        /* លុប URL និងព័ត៌មានមិនចាំបាច់ពី Browser */
        @page { 
            margin: 0; 
        }
        
        body { 
            margin: 0;
            -webkit-print-color-adjust: exact; /* ជួយឱ្យពណ៌ប៊ូតុង និងតារាងនៅដដែល */
        }

        /* បន្ថែម Margin ឱ្យក្រដាស A4 បន្តិចដើម្បីកុំឱ្យកៀកគែមពេក */
        .schedule-paper {
            margin: 0 !important;
            padding: 0.5cm !important;
            box-shadow: none !important;
            width: 100% !important;
        }

        .no-print {
            display: none !important;
        }
    }
</style>