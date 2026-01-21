<script>
    import { fade } from 'svelte/transition';
    let { data } = $props();
    let c = data.customer;

    // --- States សម្រាប់ចំនួនប្រាក់ ---
    // បំពេញតម្លៃដើមចូលក្នុង formattedAmount ពេល Load ទំព័រដំបូង
    let rawAmount = $state(c.loan_amount.toString());
    let formattedAmount = $state(Number(c.loan_amount).toLocaleString());

    function handleAmountInput(e) {
        let value = e.target.value.replace(/[^0-9]/g, '');
        rawAmount = value;
        formattedAmount = value ? Number(value).toLocaleString() : "";
    }

    // --- States សម្រាប់ស្វែងរកអាសយដ្ឋាន (SQL Search) ---
    let searchQuery = $state(c.address || ""); // តម្លៃអាសយដ្ឋានដើម
    let addressResults = $state([]);
    let selectedAddressId = $state(""); // បើអ្នកចង់ Update ID ថ្មី
    let isShowDropdown = $state(false);

    async function searchAddress() {
        if (searchQuery.length < 2) {
            addressResults = [];
            isShowDropdown = false;
            return;
        }
        const res = await fetch(`/api/locations?q=${encodeURIComponent(searchQuery)}`);
        addressResults = await res.json();
        isShowDropdown = true;
    }

    function selectAddress(addr) {
        // បង្ហាញអាសយដ្ឋានពេញលេញ
        let fullAddr = [`${addr.type}${addr.khmer_name}`];
        if (addr.parent_name) fullAddr.push(addr.parent_name);
        if (addr.grand_parent_name) fullAddr.push(addr.grand_parent_name);
        if (addr.province_name) fullAddr.push(addr.province_name);

        searchQuery = fullAddr.join(", ");
        selectedAddressId = addr.id;
        isShowDropdown = false;
    }

    // មុខងារ Validation ផ្សេងៗ
    function handleNameInput(e) { e.target.value = e.target.value.replace(/[0-9]/g, ''); }
    function handleNumberOnly(e) { e.target.value = e.target.value.replace(/[^0-9]/g, ''); }
</script>

<div class="edit-page">
    <div class="edit-card">
        <div class="header">
            <h2>កែប្រែព័ត៌មានកម្ចី</h2>
            <p>កូដអតិថិជន៖ <strong>{c.customer_id}</strong></p>
        </div>

        <form method="POST" class="form-body" autocomplete="off">
            <div class="section-title">👤 ព័ត៌មានអតិថិជន</div>
            <div class="grid">
                <div class="field">
                    <label for="customer_name">ឈ្មោះពេញ</label>
                    <input name="customer_name" type="text" value={c.customer_name} oninput={handleNameInput} required />
                </div>
                <div class="field">
                    <label for="customer_id_card">លេខអត្តសញ្ញាណប័ណ្ណ</label>
                    <input name="customer_id_card" type="text" value={c.customer_id_card} oninput={handleNumberOnly} required />
                </div>
                <div class="field">
                    <label for="phone_number">លេខទូរស័ព្ទ</label>
                    <input name="phone_number" type="text" value={c.phone_number} oninput={handleNumberOnly} required />
                </div>
                <div class="field">
                    <label for="loan_date">ថ្ងៃខែឆ្នាំខ្ចី</label>
                    <input name="loan_date" type="date" value={c.loan_date} required />
                </div>

                <div class="field full">
                    <label for="address">ទីលំនៅបច្ចុប្បន្ន (ស្វែងរក ភូមិ ឃុំ ស្រុក ឬខេត្ត)</label>
                    <div class="search-container">
                        <input 
                            id="address"
                            name="address" 
                            type="text" 
                            bind:value={searchQuery} 
                            oninput={searchAddress}
                            placeholder="វាយឈ្មោះទីតាំងដើម្បីស្វែងរក..."
                        />
                        
                        {#if isShowDropdown && addressResults.length > 0}
                            <ul class="results-dropdown">
                                {#each addressResults as addr}
                                    <li onclick={() => selectAddress(addr)} role="presentation">
                                        <span class="main-name">{addr.khmer_name} <small>({addr.type})</small></span>
                                        <span class="sub-name">
                                            {[addr.parent_name, addr.grand_parent_name, addr.province_name].filter(Boolean).join(", ")}
                                        </span>
                                    </li>
                                {/each}
                            </ul>
                        {/if}
                    </div>
                    <input type="hidden" name="address_id" value={selectedAddressId} />
                </div>
            </div>

            <div class="section-title">💰 លក្ខខណ្ឌកម្ចី</div>
            <div class="grid">
                <div class="field">
                    <label for="amount_display">ចំនួនទឹកប្រាក់ (៛)</label>
                    <input 
                        id="amount_display"
                        type="text" 
                        value={formattedAmount} 
                        oninput={handleAmountInput}
                        placeholder="0"
                    />
                    <input type="hidden" name="loan_amount" value={rawAmount} />
                </div>
                <div class="field">
                    <label for="interest_rate">ការប្រាក់ (% / ខែ)</label>
                    <input name="interest_rate" type="text" value={c.interest_rate} />
                </div>
                <div class="field">
                    <label for="loan_term">រយៈពេលខ្ចី (ខែ)</label>
                    <input name="loan_term" type="text" value={c.loan_term} oninput={handleNumberOnly} />
                </div>
                <div class="field">
                    <label for="loan_type">ប្រភេទកម្ចី</label>
                    <select name="loan_type">
                        <option value="បើកអាជីវកម្ម" selected={c.loan_type === 'បើកអាជីវកម្ម'}>បើកអាជីវកម្ម</option>
                        <option value="ផ្ទាល់ខ្លួន" selected={c.loan_type === 'ផ្ទាល់ខ្លួន'}>ផ្ទាល់ខ្លួន</option>
                    </select>
                </div>
                <div class="field full">
                    <label for="collateral">ទ្រព្យបញ្ចាំ</label>
                    <input name="collateral" type="text" value={c.collateral} />
                </div>
            </div>

            <div class="footer">
                <a href="/customers2" class="btn-cancel">បោះបង់</a>
                <button type="submit" class="btn-submit">រក្សាទុកការកែប្រែ</button>
            </div>
        </form>
    </div>
</div>

<style>
    .edit-page { display: flex; justify-content: center; padding: 40px; background: #f0f2f5; min-height: 100vh; font-family: 'Khmer OS Battambang'; }
    .edit-card { background: white; width: 750px; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
    
    .header { background: #1e3a8a; color: white; text-align: center; padding: 25px; }
    .header h2 { margin: 0; font-size: 1.4rem; }
    .header p { margin: 10px 0 0; opacity: 0.9; }

    .form-body { padding: 30px; }
    .section-title { color: #1e3a8a; font-weight: bold; border-bottom: 1px solid #eee; padding-bottom: 8px; margin: 25px 0 15px; }
    
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .full { grid-column: span 2; }

    label { display: block; font-size: 0.85rem; color: #475569; font-weight: bold; margin-bottom: 5px; }
    input, select { width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; box-sizing: border-box; }
    input:focus { outline: none; border-color: #1e3a8a; ring: 2px #1e3a8a; }

    /* Search Styles (ដូច Register) */
    .search-container { position: relative; }
    .results-dropdown {
        position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #cbd5e1;
        border-radius: 0 0 8px 8px; list-style: none; margin: 0; padding: 0; max-height: 200px; overflow-y: auto;
        z-index: 10; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .results-dropdown li { padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #f1f5f9; display: flex; flex-direction: column; }
    .results-dropdown li:hover { background-color: #f8fafc; }
    .main-name { font-weight: bold; color: #1e3a8a; font-size: 0.9rem; }
    .sub-name { font-size: 0.75rem; color: #64748b; }

    .footer { display: flex; justify-content: flex-end; gap: 10px; margin-top: 30px; }
    .btn-cancel { background: #f1f5f9; color: #475569; padding: 10px 25px; border-radius: 6px; text-decoration: none; border: 1px solid #cbd5e1; font-weight: bold; }
    .btn-submit { background: #10b981; color: white; padding: 10px 25px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
    .btn-submit:hover { background: #059669; }
</style>