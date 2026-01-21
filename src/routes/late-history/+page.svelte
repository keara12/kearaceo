<script>
    import { onMount } from 'svelte';
    import { fade, scale } from 'svelte/transition';
    import { page } from '$app/stores';
    import { invalidateAll } from '$app/navigation'; // បន្ថែមនេះ

    let { data } = $props();
    let searchQuery = $state("");
    let startDate = $state("");
    let endDate = $state("");
    let currentTime = $state("");

    // --- មុខងារលុបទិន្នន័យ (Fix) ---
    async function deleteRecord(paymentId) {
        if (window.Swal) {
            const result = await Swal.fire({
                title: 'តើអ្នកប្រាកដទេ?',
                text: "ការលុបនេះនឹងបាត់ពីប្រព័ន្ធជារៀងរហូត!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#ef4444',
                cancelButtonColor: '#64748b',
                confirmButtonText: 'បាទ/ចាស លុបវា!',
                cancelButtonText: 'បោះបង់',
                reverseButtons: true
            });

            if (result.isConfirmed) {
                const formData = new FormData();
                formData.append('paymentId', paymentId);

                // ផ្ញើទៅកាន់ Server Action
                const response = await fetch('?/deleteRecord', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    await invalidateAll(); // ទាញទិន្នន័យថ្មីពី Server
                    Swal.fire({
                        title: 'លុបរួចរាល់!',
                        icon: 'success',
                        timer: 1500,
                        showConfirmButton: false
                    });
                } else {
                    Swal.fire('Error', 'មានបញ្ហាមិនអាចលុបបាន', 'error');
                }
            }
        }
    }

    // --- ច្រោះ និងរៀបចំទិន្នន័យសម្រាប់បង្ហាញ ---
   let displayRows = $derived.by(() => {
    if (!data.late_history) return [];
    
    return data.late_history
        .filter(h => {
            const query = searchQuery.toLowerCase();
            const matchSearch = !query || 
                h.customer_name.toLowerCase().includes(query) || 
                h.customer_id.toLowerCase().includes(query) ||
                h.payment_id.toLowerCase().includes(query);

            if (!matchSearch) return false;

            const paidDate = new Date(h.paid_at);
            if (startDate && paidDate < new Date(startDate)) return false;
            if (endDate && paidDate > new Date(endDate)) return false;

            return true;
        })
        .map(h => {
            let currencySign = "៛";
            if (Number(h.currency) === 2) {
                currencySign = "$";
            }

            return {
                ...h,
                currency_display: currencySign,
                formatted_paid_at: new Date(h.paid_at).toLocaleString('km-KH')
            };
        });
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

        if (!window.Swal) {
            const script = document.createElement('script');
            script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
            document.head.appendChild(script);
        }

        return () => clearInterval(interval);
    });

    function resetFilters() { searchQuery = ""; startDate = ""; endDate = ""; }

    let stats = $derived({
        totalCount: displayRows.length,
        totalPenalty: displayRows.reduce((sum, r) => (Number(r.currency) === 1 || Number(r.currency) === 3) ? sum + r.penalty : sum, 0),
        totalPenalty1: displayRows.reduce((sum, r) => Number(r.currency) === 2 ? sum + r.penalty : sum, 0),
        totalInterest: displayRows.reduce((sum, r) => (Number(r.currency) === 1 || Number(r.currency) === 3) ? sum + r.interest : sum, 0),
        totalInterest1: displayRows.reduce((sum, r) => Number(r.currency) === 2 ? sum + r.interest : sum, 0),
        totalPaid: displayRows.reduce((sum, r) => (Number(r.currency) === 1 || Number(r.currency) === 3) ? sum + r.total_paid : sum, 0),
        totalPaid1: displayRows.reduce((sum, r) => Number(r.currency) === 2 ? sum + r.total_paid : sum, 0)
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
            <li><a href="/late-report" class="nav-link { $page.url.pathname === '/late-report' ? 'active' : '' }">⚠️ <span class="link-text">បញ្ជីយឺតតាមជួរ</span></a></li>
            <li><a href="/late-history" class="nav-link active">📜 <span class="link-text">ប្រវត្តិបង់ប្រាក់យឺត</span></a></li>
            <li><a href="/register" class="nav-link { $page.url.pathname === '/register' ? 'active' : '' }">➕ <span class="link-text">បន្ថែមអតិថិជន</span></a></li>
        </ul>
        <div class="sidebar-footer"><p>© ២០២៦ គ្រប់គ្រងដោយ ណែមគារ៉ា</p></div>
    </nav>

    <main class="main-content">
        <header class="header-bar">
            <div class="title-section"><h2>📜 ប្រវត្តិបង់ប្រាក់យឺត (បានបង់រួច)</h2></div>
            <div class="time-badge">{currentTime}</div>
        </header>

        <div class="stats-container">
            <div class="stat-card blue"><div class="stat-info"><p>បង់រួចសរុប</p><h3>{stats.totalCount} វិក្កយបត្រ</h3></div><div class="stat-icon">✅</div></div>
            <div class="stat-card orange"><div class="stat-info"><p>ពិន័យសរុប($)</p><h3>{stats.totalPenalty1.toLocaleString()}$</h3></div><div class="stat-info"><p>ពិន័យសរុប(៛)</p><h3>{stats.totalPenalty.toLocaleString()}៛</h3></div><div class="stat-icon">💰</div></div>
            <div class="stat-card purple"><div class="stat-info"><p>ការប្រាក់សរុប</p><h3>{stats.totalInterest1.toLocaleString()}$</h3></div><div class="stat-info"><p>ការប្រាក់សរុប(៛)</p><h3>{stats.totalInterest.toLocaleString()}៛</h3></div><div class="stat-icon">📈</div></div>
            <div class="stat-card green"><div class="stat-info"><p>ទឹកប្រាក់សរុប($)</p><h3>{stats.totalPaid1.toLocaleString()}$</h3></div><div class="stat-info"><p>ទឹកប្រាក់សរុប(៛)</p><h3>{stats.totalPaid.toLocaleString()}៛</h3></div><div class="stat-icon">💵</div></div>
        </div>

        <div class="content-card">
            <div class="table-header">
                <div class="search-box">
                    <span>🔍</span>
                    <input type="text" bind:value={searchQuery} placeholder="ស្វែងរកតាមឈ្មោះ, ID, ឬលេខវិក្កយបត្រ..." />
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
                            <th>លេខវិក្កយបត្រ</th>
                            <th>ID អតិថិជន</th>
                            <th>ឈ្មោះអតិថិជន</th>
                            <th>យឺត</th>
                            <th>ថ្ងៃត្រូវបង់</th>
                            <th>ថ្ងៃបង់ជាក់ស្តែង</th>
                            <th>ប្រាក់ដើម</th>
                            <th>ការប្រាក់</th>
                            <th>ប្រាក់ពិន័យ</th>
                            <th>សរុបបានបង់</th>
                            <th style="text-align: center;">សកម្មភាព</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each displayRows as row (row.payment_id)}
                            <tr transition:scale={{duration: 200, start: 0.98}}>
                                <td><span class="id-badge">{row.payment_id}</span></td>
                                <td><span class="id-badge">#{row.customer_id}</span></td>
                                <td><div class="name-box paid">{row.customer_name}</div></td>
                                <td><span class="late">{row.late}</span></td>
                                <td>{row.scheduled_date}</td>
                                <td class="phone-text">{row.formatted_paid_at}</td>
                                <td class="amount">{row.principal.toLocaleString()} {row.currency_display}</td>
                                <td class="amount interest-text">{row.interest.toLocaleString()} {row.currency_display}</td>
                                <td class="amount penalty-text">{row.penalty.toLocaleString()} {row.currency_display}</td>
                                <td class="amount total">{row.total_paid.toLocaleString()} {row.currency_display}</td>
                                <td style="text-align: center;">
                                    <button class="btn-delete" onclick={() => deleteRecord(row.payment_id)}>
                                        🗑️
                                    </button>
                                </td>
                            </tr>
                        {:else}
                            <tr><td colspan="11" class="empty-state">ពុំមានប្រវត្តិបង់ប្រាក់ឡើយ</td></tr>
                        {/each}
                    </tbody>
                </table>
            </div>
        </div>
    </main>
</div>

<style>
    .late{color: red;}
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
    .paid { color: #059669; background: #ecfdf5; }
    .amount { font-weight: 700; }
    .interest-text { color: #8b5cf6; }
    .penalty-text { color: #f59e0b; }
    .total { color: #2563eb; }
    .phone-text { color: #64748b; font-style: italic; }
    .empty-state { text-align: center; padding: 50px !important; color: #94a3b8; }

    .btn-delete { 
        background: #fee2e2; color: #ef4444; border: none; 
        padding: 8px; border-radius: 8px; cursor: pointer; transition: 0.2s; 
    }
    .btn-delete:hover { background: #ef4444; color: white; transform: scale(1.1); }

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