<script>
    import { page } from '$app/stores';
    import { onMount } from 'svelte';
    import { fade, scale } from 'svelte/transition';
    let { data } = $props();
    
    let searchQuery = $state("");
    let startDate = $state("");
    let endDate = $state("");
    let showConfirm = $state(false);
    let itemToDelete = $state(null);
    let formRef = $state(null);
    let currentTime = $state("");

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

   function isPaidUpToDate(customer) {
    const schedule = customer.repayment_schedule;
    if (!schedule || schedule.length === 0) return true;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let row of schedule) {
        // ប្រសិនបើកាលបរិច្ឆេទក្នុង DB ជាអក្សរវែង យើងបំប្លែងវាឱ្យខ្លីដើម្បីប្រៀបធៀប
        const rowDate = new Date(row.due_date || row.date);
        rowDate.setHours(0, 0, 0, 0);

        if (rowDate <= today) {
            const status = row.status ? row.status.toString().trim().toLowerCase() : "";
            if (status !== "paid") {
                return false; 
            }
        }
    }
    return true; 
}

    let filteredCustomers = $derived(
        data.customers.filter(c => {
            const query = searchQuery.toLowerCase();
            const matchesSearch = c.customer_id.toLowerCase().includes(query) ||
                                 c.customer_name.toLowerCase().includes(query) ||
                                 (c.customer_id_card && c.customer_id_card.includes(query));
            let matchesDate = true;
            if (startDate || endDate) {
                const loanDate = new Date(c.loan_date);
                if (startDate && loanDate < new Date(startDate)) matchesDate = false;
                if (endDate && loanDate > new Date(endDate)) matchesDate = false;
            }
            return matchesSearch && matchesDate;
        })
    );

    function resetFilters() { searchQuery = ""; startDate = ""; endDate = ""; }
    function askDelete(e, id) { e.preventDefault(); itemToDelete = id; formRef = e.target; showConfirm = true; }
    function proceedDelete() { if (formRef) formRef.submit(); showConfirm = false; }
</script>

<link href="https://fonts.googleapis.com/css2?family=Kantumruy+Pro:wght@300;400;600&display=swap" rel="stylesheet">

{#if showConfirm}
    <div class="modal-overlay" transition:fade={{ duration: 150 }}>
        <div class="modal-card" transition:scale={{ start: 0.9, duration: 200 }}>
            <div class="icon-warning">!</div>
            <h2>តើអ្នកប្រាកដទេ?</h2>
            <p>ទិន្នន័យអតិថិជន ID: <strong>{itemToDelete}</strong> នឹងត្រូវលុបជាអចិន្ត្រៃយ៍!</p>
            <div class="modal-actions">
                <button class="btn-cancel" onclick={() => showConfirm = false}>បោះបង់</button>
                <button class="btn-confirm" onclick={proceedDelete}>បាទ លុបវា!</button>
            </div>
        </div>
    </div>
{/if}

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
    <li>
        <a href="/" class="nav-link { $page.url.pathname === '/' ? 'active' : '' }">
            📊 <span class="link-text">ផ្ទាំងគ្រប់គ្រង</span>
        </a>
    </li>
    <li>
        <a href="/customers" class="nav-link { $page.url.pathname === '/customers' ? 'active' : '' }">
            👥 <span class="link-text">បញ្ជីអតិថិជនប្រាក់រៀល</span>
        </a>
    </li>
    <li>
        <a href="/customers1" class="nav-link { $page.url.pathname === '/customers1' ? 'active' : '' }">
            👥 <span class="link-text">បញ្ជីអតិថិជនប្រាក់ដុល្លា</span>
        </a>
    </li>
     <li>
        <a href="/customers2" class="nav-link { $page.url.pathname === '/customers2' ? 'active' : '' }">
            👥 <span class="link-text">បញ្ជីអតិថិជនត្រូវបង់កន្លះខែ</span>
        </a>
    </li>
     <li>
        <a href="/late-report" class="nav-link { $page.url.pathname === '/late-report' ? 'active' : '' }">
            ⚠️ <span class="link-text">បញ្ជីយឺតតាមជួរ</span>
        </a>
    </li>
    <li>
        <a href="/register" class="nav-link { $page.url.pathname === '/register' ? 'active' : '' }">
            ➕ <span class="link-text">បន្ថែមអតិថិជន</span>
        </a>
    </li>
</ul>

        <div class="sidebar-footer">
            <p>© ២០២៦ គ្រប់គ្រងដោយ Admin</p>
        </div>
    </nav>

    <main class="main-content">
        <header class="header-bar">
            <div class="title-section">
                <h2>📑 បញ្ជីអតិថិជន</h2>
            </div>
            <div class="time-badge">{currentTime}</div>
        </header>

        <div class="stats-container">
            <div class="stat-card blue">
                <div class="stat-info">
                    <p>អតិថិជនសរុប</p>
                    <h3>{data.stats.totalCount} <span>នាក់</span></h3>
                </div>
                <div class="stat-icon">👥</div>
            </div>
            <div class="stat-card green">
                <div class="stat-info">
                    <p>កម្ចីសរុប</p>
                    <h3>{data.stats.totalLoan} <small>៛</small></h3>
                </div>
                <div class="stat-icon">💵</div>
            </div>
            <div class="stat-card orange">
                <div class="stat-info">
                    <p>ចំណេញសរុប</p>
                    <h3>{data.stats.totalPaidInterest} <small>៛</small></h3>
                </div>
                <div class="stat-icon">💰</div>
            </div>
            <div class="stat-card purple">
                <div class="stat-info">
                    <p>ការប្រាក់ខែនេះ</p>
                    <h3>{data.stats.currentMonthInterest} <small>៛</small></h3>
                </div>
                <div class="stat-icon">📅</div>
            </div>
        </div>

        <div class="content-card">
            <div class="table-header">
                <div class="search-box">
                    <span>🔍</span>
                    <input type="text" bind:value={searchQuery} placeholder="ស្វែងរកតាមឈ្មោះ ឬ ID..." />
                </div>
                <div class="filters">
                    <div class="date-input">
                        <label>ពីថ្ងៃ</label>
                        <input type="date" bind:value={startDate} />
                    </div>
                    <div class="date-input">
                        <label>ដល់ថ្ងៃ</label>
                        <input type="date" bind:value={endDate} />
                    </div>
                    <button class="btn-reset" onclick={resetFilters}>🔄</button>
                </div>
            </div>

            <div class="table-responsive">
                <table>
                     <thead>
                        <tr>
                            <th>លេខរៀងID</th>
                            <th>ឈ្មោះអតិថិជន</th>
                            <th class="">អត្តសញ្ញាណប័ណ្ណ</th>
                            <th>លេខទូរស័ព្ទ</th>
                            <th class="">អាសយដ្ឋាន</th>
                            <th>ចំនួនកម្ចី</th>
                            <th class="">ការប្រាក់</th>
                            <th class="">កាលបរិច្ឆេទ</th>
                            <th class="">រយៈពេល</th>
                            <th>ប្រភេទ</th>
                            <th class="">ទ្រព្យបញ្ចាំ</th>
                            <th class="sticky-action">សកម្មភាព</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each filteredCustomers as c}
                        <tr>
                            <td><span class="id-badge">#{c.customer_id}</span></td>
                            <td>
                                <div class="name-box {isPaidUpToDate(c) ? 'paid' : 'overdue'}">
                                    {c.customer_name}
                                </div>
                            </td>
                            <td class="">{c.customer_id_card || '---'}</td>
                            <td>{c.phone_number}</td>
                            <td class=""><span class="address-text" title={c.address}>{c.address}</span></td>
                            <td class="amount">{Number(c.loan_amount).toLocaleString()} ៛</td>
                            <td class="">{c.interest_rate}%</td>
                            
                            <td class="">
                                {c.loan_date ? new Date(c.loan_date).toISOString().split('T')[0] : '---'}
                            </td>

                            <td class="">{c.loan_term} ខែ</td>
                            <td>
                                <span class="status-badge {c.loan_type === 'Daily' ? 'daily' : 'monthly'}">
                                    {c.loan_type}
                                </span>
                            </td>
                            <td class="">{c.collateral || '---'}</td>
                            <td class="sticky-action">
                                <div class="action-btns">
                                    <a href="/customers/view/{c.customer_id}" class="btn-view" title="មើល">👁️</a>
                                    <a href="/edit/{c.customer_id}" class="btn-edit" title="កែប្រែ">✏️</a>
                                    <form method="POST" action="?/deleteCustomer" onsubmit={(e) => askDelete(e, c.customer_id)}>
                                        <input type="hidden" name="id" value={c.customer_id} />
                                        <button type="submit" class="btn-delete" title="លុប">🗑️</button>
                                    </form>
                                </div>
                            </td>
                        </tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    </main>
</div>

<style>
    /* រក្សាទុក Style ដើមរបស់អ្នកទាំងអស់ */
    .nav-link.active {
        background-color: #1a3a8a;
        color: white;
        border-radius: 8px;
    }
    :global(body) {
        margin: 0;
        background: #f0f2f5;
        font-family: 'Kantumruy Pro', sans-serif;
        color: #1e293b;
    }
    .dashboard-container { display: flex; min-height: 100vh; flex-direction: column; }
    .sidebar {
        width: 280px;
        background: #0f172a;
        color: white;
        display: flex;
        flex-direction: column;
        padding: 25px 0;
        position: fixed;
        height: 100vh;
        z-index: 100;
    }
    .sidebar-header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 0 25px 30px;
        border-bottom: 1px solid #ffffff1a;
    }
    .sidebar-header img { width: 45px; height: 45px; }
    .logo-text h1 { font-size: 18px; margin: 0; color: #38bdf8; }
    .logo-text span { font-size: 12px; opacity: 0.7; }
    .nav-menu { list-style: none; padding: 20px 15px; flex-grow: 1; }
    .nav-menu li { margin-bottom: 8px; }
    .nav-link {
        display: flex;
        align-items: center;
        padding: 12px 15px;
        color: #94a3b8;
        text-decoration: none;
        border-radius: 10px;
        transition: 0.3s;
    }
    .nav-link:hover {
        background: #38bdf8;
        color: white;
    }
    .sidebar-footer { padding: 20px; font-size: 11px; text-align: center; opacity: 0.5; }
    .main-content { margin-left: 280px; flex-grow: 1; padding: 20px; }
    .header-bar { display: flex; flex-direction: column; gap: 15px; margin-bottom: 25px; }
    .time-badge {
        background: white;
        padding: 8px 15px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 600;
        box-shadow: 0 2px 10px rgba(0,0,0,0.05);
        align-self: flex-start;
    }
    .stats-container {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 15px;
        margin-bottom: 25px;
    }
    .stat-card {
        background: white;
        padding: 15px;
        border-radius: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        border-bottom: 4px solid transparent;
    }
    .stat-card.blue { border-color: #3b82f6; }
    .stat-card.green { border-color: #10b981; }
    .stat-card.orange { border-color: #f59e0b; }
    .stat-card.purple { border-color: #8b5cf6; }
    .stat-info p { margin: 0; font-size: 12px; color: #64748b; }
    .stat-info h3 { margin: 5px 0 0; font-size: 18px; }
    .stat-icon { font-size: 24px; opacity: 0.8; }
    .content-card {
        background: white;
        border-radius: 16px;
        padding: 15px;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
    }
    .table-header { display: flex; flex-direction: column; gap: 15px; margin-bottom: 20px; }
    .search-box { position: relative; width: 100%; }
    .search-box span { position: absolute; left: 15px; top: 50%; transform: translateY(-50%); opacity: 0.4; }
    .search-box input {
        width: 100%;
        padding: 12px 12px 12px 45px;
        border: 1px solid #e2e8f0;
        border-radius: 12px;
        box-sizing: border-box;
    }
    .filters { display: flex; flex-wrap: wrap; gap: 10px; }
    .date-input { flex: 1; min-width: 120px; display: flex; flex-direction: column; gap: 4px; }
    .date-input label { font-size: 11px; font-weight: 600; color: #94a3b8; }
    .date-input input { padding: 8px; border: 1px solid #e2e8f0; border-radius: 8px; font-size: 12px; }
    .btn-reset { padding: 8px 15px; background: #f1f5f9; border: none; border-radius: 8px; cursor: pointer; }
    .table-responsive { overflow-x: auto; -webkit-overflow-scrolling: touch; }
    table { width: 100%; border-collapse: collapse; }
    th {
        text-align: left;
        padding: 12px;
        background: #f8fafc;
        color: #64748b;
        font-size: 12px;
        white-space: nowrap;
    }
    td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
    .id-badge { background: #f1f5f9; padding: 4px 6px; border-radius: 6px; font-weight: 600; font-size: 11px; }
    .name-box { font-weight: 600; padding: 4px 8px; border-radius: 6px; display: inline-block; font-size: 12px; }
    .paid { color: #0369a1; background: #e0f2fe; }
    .overdue { color: #be123c; background: #ffe4e6; }
    .amount { font-weight: 700; color: #059669; white-space: nowrap; }
    .status-badge { padding: 3px 8px; border-radius: 20px; font-size: 10px; font-weight: 600; }
    .daily { background: #fef3c7; color: #92400e; }
    .monthly { background: #ede9fe; color: #5b21b6; }
    .action-btns { display: flex; gap: 5px; }
    .action-btns a, .action-btns button {
        width: 32px; height: 32px;
        display: flex; align-items: center; justify-content: center;
        border-radius: 8px; border: none; cursor: pointer;
    }
    .btn-view { background: #e0f2fe; color: #0284c7; }
    .btn-edit { background: #fef3c7; color: #d97706; }
    .btn-delete { background: #ffe4e6; color: #e11d48; }
    .modal-overlay {
        position: fixed; top:0; left:0; width:100%; height:100%;
        background: rgba(15, 23, 42, 0.6);
        display:flex; align-items:center; justify-content:center;
        z-index: 1000; backdrop-filter: blur(4px); padding: 20px;
    }
    .modal-card {
        background: white; padding: 30px; border-radius: 20px;
        text-align: center; width: 100%; max-width: 400px;
    }
    @media (min-width: 1024px) {
        .dashboard-container { flex-direction: row; }
        .header-bar { flex-direction: row; justify-content: space-between; align-items: center; }
        .stats-container { grid-template-columns: repeat(4, 1fr); }
        .table-header { flex-direction: row; justify-content: space-between; align-items: center; }
        .search-box { width: auto; flex: 1; }
        .content-card { padding: 25px; }
        .stat-info h3 { font-size: 22px; }
        .stat-info p { font-size: 14px; }
    }
    @media (max-width: 1023px) {
        .sidebar {
            width: 100%;
            height: 65px;
            bottom: 0;
            top: auto;
            flex-direction: row;
            padding: 0;
            justify-content: space-around;
            border-top: 1px solid #ffffff1a;
        }
        .sidebar-header, .sidebar-footer, .link-text { display: none; }
        .nav-menu {
            display: flex;
            width: 100%;
            padding: 0;
            margin: 0;
            justify-content: space-around;
        }
        .nav-menu li { margin: 0; flex: 1; }
        .nav-link {
            justify-content: center;
            border-radius: 0;
            height: 65px;
            font-size: 24px;
        }
        .main-content { margin-left: 0; padding-bottom: 90px; }
    }
</style>
