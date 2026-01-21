<script>
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import { enhance } from '$app/forms';
    
    let { data } = $props();
    
    let searchQuery = $state("");
    let startDate = $state("");
    let endDate = $state("");
    let currentTime = $state("");

    function updateTime() {
        const now = new Date();
        const datePart = now.toLocaleDateString('km-KH', { day: 'numeric', month: 'long', year: 'numeric' });
        const timePart = now.toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        currentTime = `📅 ${datePart} | 🕒 ${timePart}`;
    }

    function resetFilters() {
        searchQuery = "";
        startDate = "";
        endDate = "";
    }

    onMount(() => {
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    });

    // --- ១. Logic សម្រាប់បូកសរុបប្រវត្តិបង់ប្រាក់តាម Customer ID (ប្រើសម្រាប់បង្ហាញក្នុងតារាង) ---
    let historyTotalsByCustomer = $derived.by(() => {
        if (!data?.customer_late_history) return {};
        return data.customer_late_history.reduce((acc, rec) => {
            const id = rec.customer_id;
            const amount = Number(rec.total_paid || rec.paid_amount || 0);
            acc[id] = (acc[id] || 0) + amount;
            return acc;
        }, {});
    });

    // --- ២. Logic គណនាជួរនីមួយៗក្នុងតារាង ---
    let displayRows = $derived.by(() => {
        let rows = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (!data?.customers) return [];

        data.customers.forEach(c => {
            const query = searchQuery.toLowerCase();
            const matchQuery = !query || 
                c.customer_name.toLowerCase().includes(query) || 
                c.customer_id.toLowerCase().includes(query) ||
                (c.phone_number && c.phone_number.includes(query));

            if (!matchQuery) return;

            const monthlyRate = Number(c.interest_rate || 0) / 100;
            const dailyPenaltyRate = (Number(c.loan_amount || 0) * monthlyRate) / 30;

            if (c.repayment_schedule) {
                c.repayment_schedule.forEach((entry) => {
                    const dueDate = new Date(entry.date);
                    dueDate.setHours(0, 0, 0, 0);

                    const start = startDate ? new Date(startDate) : null;
                    const end = endDate ? new Date(endDate) : null;
                    if (start) start.setHours(0,0,0,0);
                    if (end) end.setHours(0,0,0,0);

                    const matchDate = (!start || dueDate >= start) && (!end || dueDate <= end);
                    if (!matchDate) return;

                    const status = entry.status?.toLowerCase().trim() || "";

                    if (dueDate <= today) {
                        const diffTime = today.getTime() - dueDate.getTime();
                        let lateDays = (status !== "paid") ? Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24))) : 0;

                        const penalty = Math.round(dailyPenaltyRate * lateDays);
                        const begBalance = Number(entry.beginning_balance || 0);
                        const calculatedInterest = Math.round(begBalance * monthlyRate);
                        const principalToPay = Number(entry.pay_principal || 0);
                        const grandTotal = principalToPay + calculatedInterest + penalty;

                        rows.push({
                            id: c.customer_id,
                            name: c.customer_name,
                            scheduled_date: entry.date,
                            late_days: lateDays, 
                            penalty: penalty,
                            principal: principalToPay,
                            interest: calculatedInterest,
                            grand_total: grandTotal,
                            total_history_paid: historyTotalsByCustomer[c.customer_id] || 0,
                            status: status,
                            sortKey: dueDate.getTime() 
                        });
                    }
                });
            }
        });
        return rows.sort((a, b) => b.sortKey - a.sortKey);
    });

    // --- ៣. Stats: បូកសរុបប្រាក់ប្រមូលបានសរុបតែពី History (Total Paid) ---
    let stats = $derived({
        totalOverdueRows: displayRows.filter(r => r.status !== 'paid').length,
        totalPenalty: displayRows.reduce((sum, r) => sum + (r.status !== 'paid' ? r.penalty : 0), 0),
        // បូកសរុបសាច់ប្រាក់ពិតប្រាកដចេញពី Database History ទាំងមូល
        totalCollected: (data.customer_late_history || []).reduce((sum, rec) => 
            sum + Number(rec.total_paid || rec.paid_amount || 0), 0)
    });
</script>

<link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@300;400;600&display=swap" rel="stylesheet">

<div class="dashboard-container">
    <nav class="sidebar">
        <div class="sidebar-header">
            <img src="https://cdn-icons-png.flaticon.com/512/2830/2830284.png" alt="logo" />
            <div class="logo-text">
                <h1>ឥណទាន</h1>
                <span>ប្រព័ន្ធគ្រប់គ្រងកម្ចី</span>
            </div>
        </div>
        <ul class="nav-menu">
            <li><a href="/" class="nav-link {$page.url.pathname === '/' ? 'active' : ''}">📊 <span class="link-text">ផ្ទាំងគ្រប់គ្រង</span></a></li>
            <li><a href="/customers" class="nav-link {$page.url.pathname === '/customers' ? 'active' : ''}">👥 <span class="link-text">បញ្ជីអតិថិជន</span></a></li>
            <li><a href="/late-report" class="nav-link {$page.url.pathname === '/late-report' ? 'active' : ''}">⚠️ <span class="link-text">បញ្ជីយឺតតាមជួរ</span></a></li>
        </ul>
    </nav>

    <main class="main-content">
        <header class="header-bar">
            <div class="title-section"><h2>⚠️ របាយការណ៍ត្រូវបង់ប្រាក់យឺត</h2></div>
            <div class="time-badge">{currentTime}</div>
        </header>

        <div class="stats-container">
            <div class="stat-card blue">
                <div class="stat-info"><p>វគ្គយឺតសរុប</p><h3>{stats.totalOverdueRows} <span>វគ្គ</span></h3></div>
                <div class="stat-icon">🕒</div>
            </div>
            <div class="stat-card orange">
                <div class="stat-info"><p>ពិន័យសរុប (ជំពាក់)</p><h3>{stats.totalPenalty.toLocaleString()} <small>៛</small></h3></div>
                <div class="stat-icon">💰</div>
            </div>
            <div class="stat-card green">
                <div class="stat-info">
                    <p>ប្រាក់ប្រមូលបានសរុប (ក្នុង DB)</p>
                    <h3 style="color: #10b981;">{stats.totalCollected.toLocaleString()} <small>៛</small></h3>
                </div>
                <div class="stat-icon">💵</div>
            </div>
        </div>

        <div class="content-card">
            <div class="table-header">
                <div class="search-box">
                    <span>🔍</span>
                    <input type="text" bind:value={searchQuery} placeholder="ស្វែងរកតាមឈ្មោះ, ID ឬទូរស័ព្ទ..." />
                </div>
                <div class="filters">
                    <div class="date-input"><label>ពីថ្ងៃបង់</label><input type="date" bind:value={startDate} /></div>
                    <div class="date-input"><label>ដល់ថ្ងៃបង់</label><input type="date" bind:value={endDate} /></div>
                    <button class="btn-reset" onclick={resetFilters}>🔄</button>
                </div>
            </div>

            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>ឈ្មោះអតិថិជន</th>
                            <th class="center-text">ថ្ងៃត្រូវបង់</th>
                            <th class="center-text">យឺត(ថ្ងៃ)</th>
                            <th class="center-text">ប្រាក់ដើម</th>
                            <th class="center-text">ការប្រាក់</th>
                            <th class="center-text">ពិន័យ</th>
                            <th class="center-text">ត្រូវបង់</th>
                           
                            <th class="center-text">សកម្មភាព</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each displayRows as row}
                            <tr>
                                <td><span class="id-sub">#{row.id}</span></td>
                                <td><span class="name-box overdue">{row.name}</span></td>
                                <td class="center-text"><span class="id-badge">{row.scheduled_date}</span></td>
                                <td class="center-text"><span class="badge-late">{row.late_days} ថ្ងៃ</span></td>
                                <td class="amount center-text">{row.principal.toLocaleString()}</td>
                                <td class="amount center-text interest-text">{row.interest.toLocaleString()}</td>
                                <td class="amount center-text penalty-text">{row.penalty.toLocaleString()}</td>
                                <td class="amount center-text total-highlight">{row.grand_total.toLocaleString()} ៛</td>
                                <td class="center-text">
                                    {#if row.status === "paid"}
                                        <span class="paid-label">✅ បង់រួច</span>
                                    {:else}
                                        <form method="POST" action="?/payInstallment" use:enhance>
                                            <input type="hidden" name="customerId" value={row.id} />
                                            <input type="hidden" name="date" value={row.scheduled_date} />
                                            <input type="hidden" name="penalty" value={row.penalty} />
                                            <input type="hidden" name="interest" value={row.interest} />
                                            <input type="hidden" name="grandTotal" value={row.grand_total} />
                                            <button type="submit" class="btn-pay-red">បង់ប្រាក់</button>
                                        </form>
                                    {/if}
                                </td>
                            </tr>
                        {:else}
                            <tr><td colspan="10" class="empty-msg">មិនមានទិន្នន័យឡើយ</td></tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    </main>
</div>

<style>
    /* រក្សាស្ទីលចាស់របស់អ្នកទាំងអស់... */
    :global(body) { margin: 0; background: #f0f2f5; font-family: 'Kantumruy Pro', sans-serif; }
    .dashboard-container { display: flex; min-height: 100vh; }
    .sidebar { width: 280px; background: #0f172a; color: white; position: fixed; height: 100vh; padding: 25px 0; z-index: 100; }
    .sidebar-header { display: flex; align-items: center; gap: 12px; padding: 0 25px 30px; border-bottom: 1px solid #ffffff1a; }
    .sidebar-header img { width: 40px; }
    .logo-text h1 { font-size: 18px; margin: 0; color: #38bdf8; }
    .logo-text span { font-size: 11px; opacity: 0.6; }
    .nav-menu { list-style: none; padding: 20px 15px; margin: 0; }
    .nav-link { display: flex; align-items: center; padding: 12px 15px; color: #94a3b8; text-decoration: none; border-radius: 10px; margin-bottom: 5px; transition: 0.3s; }
    .nav-link.active { background: #38bdf8; color: #0f172a; font-weight: 600; }
    .main-content { margin-left: 280px; flex-grow: 1; padding: 25px; width: calc(100% - 280px); }
    .header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
    .time-badge { background: white; padding: 8px 18px; border-radius: 12px; font-size: 12px; font-weight: 600; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
    .stats-container { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 25px; }
    .stat-card { background: white; padding: 20px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 4px solid #3b82f6; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .stat-card.orange { border-color: #f59e0b; }
    .stat-card.green { border-color: #10b981; }
    .stat-info p { margin: 0; color: #64748b; font-size: 13px; }
    .stat-info h3 { margin: 5px 0 0; font-size: 20px; font-weight: 700; }
    .stat-icon { font-size: 24px; opacity: 0.3; }
    .content-card { background: white; border-radius: 16px; padding: 20px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .table-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; flex-wrap: wrap; gap: 15px; }
    .search-box { position: relative; width: 300px; }
    .search-box span { position: absolute; left: 15px; top: 12px; opacity: 0.4; }
    .search-box input { width: 100%; padding: 10px 10px 10px 40px; border: 1px solid #e2e8f0; border-radius: 10px; font-family: 'Kantumruy Pro'; outline: none; }
    .filters { display: flex; align-items: flex-end; gap: 10px; }
    .date-input { display: flex; flex-direction: column; gap: 5px; }
    .date-input label { font-size: 11px; color: #64748b; font-weight: 600; }
    .date-input input { padding: 8px; border: 1px solid #e2e8f0; border-radius: 8px; font-family: 'Kantumruy Pro'; font-size: 13px; }
    .btn-reset { padding: 8px 12px; background: #f1f5f9; border: none; border-radius: 8px; cursor: pointer; transition: 0.2s; }
    .btn-reset:hover { background: #e2e8f0; }
    .table-responsive { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 12px; background: #f8fafc; color: #64748b; font-size: 11px; text-transform: uppercase; border-bottom: 2px solid #edf2f7; }
    td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .center-text { text-align: center !important; }
    .id-sub { color: #94a3b8; font-size: 11px; }
    .name-box { font-weight: 600; padding: 4px 10px; border-radius: 6px; display: inline-block; font-size: 12px; }
    .overdue { background: #ffe4e6; color: #be123c; }
    .id-badge { background: #f1f5f9; padding: 4px 8px; border-radius: 6px; font-weight: 600; font-size: 11px; }
    .badge-late { background: #fee2e2; color: #dc2626; padding: 3px 8px; border-radius: 5px; font-weight: 600; font-size: 11px; }
    .amount { font-weight: 700; font-family: 'monospace'; }
    .interest-text { color: #6366f1; }
    .penalty-text { color: #f59e0b; }
    .paid-text { color: #10b981; font-weight: 700; background: #f0fdf4; padding: 4px 8px; border-radius: 6px; }
    .total-highlight { color: #2563eb; background: #eff6ff; }
    .paid-label { font-weight: 600; color: #10b981; font-size: 12px; }
    .btn-pay-red { background: #ef4444; color: white; border: none; padding: 6px 15px; border-radius: 6px; cursor: pointer; font-family: 'Kantumruy Pro'; font-weight: 600; }
    .btn-pay-red:hover { background: #dc2626; }
    .empty-msg { text-align: center; padding: 50px; color: #94a3b8; }
</style>