<script>
    import { onMount } from 'svelte';
    import { enhance } from '$app/forms';
    import { fade, scale } from 'svelte/transition';
    import { page } from '$app/stores';

    let { data } = $props();
    let searchQuery = $state("");
    let startDate = $state("");
    let endDate = $state("");
    let currentTime = $state("");

    let displayRows = $derived.by(() => {
        if (!data.customers) return [];
        let rows = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        data.customers.forEach(c => {
            const query = searchQuery.toLowerCase();
            const matchSearch = !query || 
                c.customer_name.toLowerCase().includes(query) || 
                c.customer_id.toLowerCase().includes(query) ||
                (c.phone_number && c.phone_number.includes(query));

            if (!matchSearch) return;

            if (c.repayment_schedule) {
                c.repayment_schedule.forEach((entry) => {
                    const dueDate = new Date(entry.date);
                    dueDate.setHours(0, 0, 0, 0);
                    
                    if (dueDate <= today && entry.status === "Unpaid") {
                        if (startDate && dueDate < new Date(startDate)) return;
                        if (endDate && dueDate > new Date(endDate)) return;

                        const diffTime = today.getTime() - dueDate.getTime();
                        const lateDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
                        
                        const monthlyRate = Number(c.interest_rate || 0) / 100;
                        const penalty = Math.round(((Number(c.loan_amount) * monthlyRate) / 30) * lateDays);
                        
                        // កំណត់សញ្ញារូបិយប័ណ្ណ៖ 1 ឬ 3 = ៛, 2 = $
                        const currencySign = (c.currency_type === "2") ? "$" : "៛";
                        const currencyId = c.currency_type;

                        rows.push({
                            id: c.customer_id,
                            name: c.customer_name,
                            phone: c.phone_number || "---",
                            scheduled_date: entry.date,
                            late_days: lateDays,
                            penalty: penalty,
                            interest: entry.pay_interest,
                            principal: entry.pay_principal,
                            grand_total: entry.pay_principal + entry.pay_interest + penalty,
                            currency: currencySign, // ប្រើ currencySign ដែលបានកំណត់ខាងលើ
                            currency_id: currencyId,
                            raw_date: dueDate
                        });
                    }
                });
            }
        });
        return rows.sort((a, b) => b.raw_date - a.raw_date);
    });

    function updateTime() {
        const now = new Date();
        const datePart = now.toLocaleDateString('km-KH', { day: 'numeric', month: 'long', year: 'numeric' });
        const timePart = now.toLocaleTimeString('km-KH', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
        currentTime = `📅 ${datePart} | 🕒 ${timePart}`;
    }

    onMount(() => {
        updateTime();
        const interval = setInterval(updateTime, 1000);
        return () => clearInterval(interval);
    });

    function resetFilters() { searchQuery = ""; startDate = ""; endDate = ""; }

    let stats = $derived({
        totalLateCount: displayRows.length,
        totalPenalty: displayRows.reduce((sum, r) => sum + r.penalty, 0),
        totalInterest: displayRows.reduce((sum, r) => sum + r.interest, 0),
        totalGrand: displayRows.reduce((sum, r) => sum + r.grand_total, 0)
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
            <li><a href="/" class="nav-link { $page.url.pathname === '/' ? 'active' : '' }">📊 <span class="link-text">ផ្ទាំងគ្រប់គ្រង</span></a></li>
            <li><a href="/customers" class="nav-link { $page.url.pathname === '/customers' ? 'active' : '' }">👥 <span class="link-text">បញ្ជីអតិថិជនប្រាក់រៀល</span></a></li>
            <li><a href="/customers1" class="nav-link { $page.url.pathname === '/customers1' ? 'active' : '' }">👥 <span class="link-text">បញ្ជីអតិថិជនប្រាក់ដុល្លា</span></a></li>
            <li><a href="/customers2" class="nav-link { $page.url.pathname === '/customers2' ? 'active' : '' }">👥 <span class="link-text">បញ្ជីអតិថិជនត្រូវបង់កន្លះខែ</span></a></li>
            <li><a href="/late-report" class="nav-link active">⚠️ <span class="link-text">បញ្ជីយឺតតាមជួរ</span></a></li>
            <li><a href="/register" class="nav-link { $page.url.pathname === '/register' ? 'active' : '' }">➕ <span class="link-text">បន្ថែមអតិថិជន</span></a></li>
        </ul>
        <div class="sidebar-footer"><p>© ២០២៦ គ្រប់គ្រងដោយ Admin</p></div>
    </nav>

    <main class="main-content">
        <header class="header-bar">
            <div class="title-section"><h2>⚠️ បញ្ជីត្រូវបង់ប្រាក់យឺត</h2></div>
            <div class="time-badge">{currentTime}</div>
        </header>

        <div class="stats-container">
            <div class="stat-card blue"><div class="stat-info"><p>យឺតសរុប</p><h3>{stats.totalLateCount} នាក់</h3></div><div class="stat-icon">🕒</div></div>
            <div class="stat-card orange"><div class="stat-info"><p>ពិន័យសរុប</p><h3>{stats.totalPenalty.toLocaleString()}</h3></div><div class="stat-icon">💰</div></div>
            <div class="stat-card purple"><div class="stat-info"><p>ការប្រាក់សរុប</p><h3>{stats.totalInterest.toLocaleString()}</h3></div><div class="stat-icon">📈</div></div>
            <div class="stat-card green"><div class="stat-info"><p>ត្រូវប្រមូលសរុប</p><h3>{stats.totalGrand.toLocaleString()}</h3></div><div class="stat-icon">💵</div></div>
        </div>

        <div class="content-card">
            <div class="table-header">
                <div class="search-box">
                    <span>🔍</span>
                    <input type="text" bind:value={searchQuery} placeholder="ស្វែងរកតាមឈ្មោះ, ID ឬទូរស័ព្ទ..." />
                </div>
                <div class="filters">
                    <div class="date-input">
                        <label>ពីថ្ងៃបង់</label>
                        <input type="date" bind:value={startDate} />
                    </div>
                    <div class="date-input">
                        <label>ដល់ថ្ងៃបង់</label>
                        <input type="date" bind:value={endDate} />
                    </div>
                    <button class="btn-reset" onclick={resetFilters}>🔄</button>
                </div>
            </div>

            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>ឈ្មោះអតិថិជន</th>
                            <th>លេខទូរស័ព្ទ</th>
                            <th>ថ្ងៃត្រូវបង់</th>
                            <th>យឺត(ថ្ងៃ)</th>
                            <th>ប្រាក់ដើម</th>
                            <th>ការប្រាក់</th>
                            <th>ប្រាក់ពិន័យ</th>
                            <th>សរុបត្រូវបង់</th>
                            <th class="sticky-action">សកម្មភាព</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each displayRows as row}
                            <tr transition:scale={{duration: 200, start: 0.98}}>
                                <td><span class="id-badge">#{row.id}</span></td>
                                <td><div class="name-box overdue">{row.name}</div></td>
                                <td class="phone-text">{row.phone}</td>
                                <td>{row.scheduled_date}</td>
                                <td><span class="badge-late">{row.late_days} ថ្ងៃ</span></td>
                                <td class="amount">{row.principal.toLocaleString()} {row.currency}</td>
                                <td class="amount interest-text">{row.interest.toLocaleString()} {row.currency}</td>
                                <td class="amount penalty-text">{row.penalty.toLocaleString()} {row.currency}</td>
                                <td class="amount total">{row.grand_total.toLocaleString()} {row.currency}</td>
                                <td class="sticky-action">
                                    <form method="POST" action="?/payInstallment" use:enhance>
                                        <input type="hidden" name="customerId" value={row.id} />
                                         <input type="hidden" name="late" value={row.late_days} />
                                        <input type="hidden" name="date" value={row.scheduled_date} />
                                        <input type="hidden" name="penalty" value={row.penalty} />
                                        
                                        <input type="hidden" name="principal" value={row.principal} />
                                        <input type="hidden" name="interest" value={row.interest} />
                                        <input type="hidden" name="grandTotal" value={row.grand_total} />
                                        <input type="hidden" name="currency" value={row.currency_id} />

                                        <button type="submit" class="btn-pay" onclick={(e) => !confirm('កត់ត្រាការបង់ប្រាក់?') && e.preventDefault()}>បង់</button>
                                    </form>
                                </td>
                            </tr>
                        {:else}
                            <tr><td colspan="10" class="empty-state">ពុំមានទិន្នន័យយឺតឡើយ</td></tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    </main>
</div>

<style>
    :global(body) { margin: 0; background: #f0f2f5; font-family: 'Kantumruy Pro', sans-serif; color: #1e293b; }
    .dashboard-container { display: flex; min-height: 100vh; flex-direction: column; }
    .sidebar { width: 280px; background: #0f172a; color: white; display: flex; flex-direction: column; padding: 25px 0; position: fixed; height: 100vh; z-index: 100; }
    .sidebar-header { display: flex; align-items: center; gap: 12px; padding: 0 25px 30px; border-bottom: 1px solid #ffffff1a; }
    .sidebar-header img { width: 45px; }
    .logo-text h1 { font-size: 18px; margin: 0; color: #38bdf8; }
    .logo-text span { font-size: 12px; opacity: 0.7; }
    .nav-menu { list-style: none; padding: 20px 15px; flex-grow: 1; }
    .nav-link { display: flex; align-items: center; padding: 12px 15px; color: #94a3b8; text-decoration: none; border-radius: 10px; transition: 0.3s; margin-bottom: 8px; }
    .nav-link.active { background: #38bdf8; color: white; font-weight: 600; }
    .main-content { margin-left: 280px; flex-grow: 1; padding: 20px; }
    .header-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; }
    .time-badge { background: white; padding: 8px 15px; border-radius: 12px; font-size: 12px; font-weight: 600; box-shadow: 0 2px 10px rgba(0,0,0,0.05); }
    .stats-container { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 25px; }
    .stat-card { background: white; padding: 15px; border-radius: 16px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); border-bottom: 4px solid transparent; }
    .stat-card.blue { border-color: #3b82f6; }
    .stat-card.orange { border-color: #f59e0b; }
    .stat-card.purple { border-color: #8b5cf6; }
    .stat-card.green { border-color: #10b981; }
    .stat-info h3 { margin: 5px 0 0; font-size: 18px; }
    .stat-info p { margin: 0; font-size: 12px; color: #64748b; }
    .content-card { background: white; border-radius: 16px; padding: 25px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .table-header { display: flex; justify-content: space-between; align-items: center; gap: 15px; margin-bottom: 20px; }
    .search-box { position: relative; flex: 1; }
    .search-box input { width: 50%; padding: 12px 12px 12px 45px; border: 1px solid #e2e8f0; border-radius: 12px; }
    .search-box span { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); opacity: 0.4; }
    .filters { display: flex; gap: 10px; }
    .date-input { display: flex; flex-direction: column; gap: 4px; }
    .date-input label { font-size: 11px; font-weight: 600; color: #94a3b8; }
    .date-input input { padding: 8px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; }
    .btn-reset { align-self: flex-end; padding: 8px 15px; background: #f1f5f9; border: none; border-radius: 8px; cursor: pointer; }
    .table-responsive { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: 12px; background: #f8fafc; color: #64748b; font-size: 12px; border-bottom: 2px solid #edf2f7; }
    td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .id-badge { background: #f1f5f9; padding: 4px 6px; border-radius: 6px; font-weight: 600; font-size: 11px; }
    .name-box { font-weight: 600; padding: 4px 10px; border-radius: 6px; display: inline-block; }
    .overdue { color: #be123c; background: #ffe4e6; }
    .badge-late { background: #fee2e2; color: #dc2626; padding: 3px 8px; border-radius: 5px; font-weight: 600; }
    .amount { font-weight: 700; }
    .interest-text { color: #8b5cf6; }
    .penalty-text { color: #f59e0b; }
    .total { color: #2563eb; }
    .btn-pay { background: #10b981; color: white; border: none; padding: 6px 15px; border-radius: 8px; cursor: pointer; font-weight: 600; }
    .empty-state { text-align: center; padding: 50px !important; color: #94a3b8; }

    @media (max-width: 1024px) {
        .sidebar { width: 100%; height: 65px; bottom: 0; top: auto; flex-direction: row; padding: 0; justify-content: space-around; }
        .sidebar-header, .sidebar-footer, .link-text { display: none; }
        .nav-menu { display: flex; width: 100%; padding: 0; margin: 0; }
        .nav-link { justify-content: center; height: 65px; font-size: 24px; border-radius: 0; flex: 1; }
        .main-content { margin-left: 0; padding-bottom: 80px; }
        .stats-container { grid-template-columns: repeat(2, 1fr); }
        .table-header { flex-direction: column; align-items: stretch; }
    }
</style>