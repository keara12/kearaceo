<script>
  import { fade } from 'svelte/transition';
  let { data, form } = $props();

  // --- States សម្រាប់គ្រប់គ្រងចំនួនប្រាក់ ---
  let rawAmount = $state(""); 
  let formattedAmount = $state(""); 
  let currencyType = $state("រៀល"); 

  // --- States សម្រាប់ស្វែងរកអាសយដ្ឋាន (SQL Search) ---
  let searchQuery = $state("");
  let addressResults = $state([]);
  let selectedAddressId = $state("");
  let isShowDropdown = $state(false);

  // មុខងារស្វែងរកអាសយដ្ឋានពី API
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

  // មុខងារពេលជ្រើសរើសអាសយដ្ឋាន
  function selectAddress(addr) {
    let fullAddr = [];
    fullAddr.push(`${addr.type}${addr.khmer_name}`);
    if (addr.parent_name) fullAddr.push(addr.parent_name);
    if (addr.grand_parent_name) fullAddr.push(addr.grand_parent_name);
    if (addr.province_name) fullAddr.push(addr.province_name);

    searchQuery = fullAddr.join(", ");
    selectedAddressId = addr.id;
    isShowDropdown = false;
  }

  function handleAmountInput(e) {
    let value = e.target.value.replace(/[^0-9]/g, '');
    rawAmount = value;
    formattedAmount = value ? Number(value).toLocaleString() : "";
  }

  function handleNameInput(e) { e.target.value = e.target.value.replace(/[0-9]/g, ''); }
  function handleNumberOnly(e) { e.target.value = e.target.value.replace(/[^0-9]/g, ''); }
</script>

<div class="page-bg">
  <div class="card">
    <div class="header">
      <h1>ប្រព័ន្ធគ្រប់គ្រងឥណទានប្រាក់រៀល</h1>
      <p>LOAN MANAGEMENT SYSTEM</p>
    </div>

    <form method="POST" class="content" autocomplete="off">
      <h3 class="section-title">👤 ព័ត៌មានអតិថិជន</h3>
      <div class="grid">
        <div class="field">
          <label for="customer_id">ID អតិថិជន</label>
          <input id="customer_id" name="customer_id" type="text" value={data.nextId} readonly />
        </div>

        <div class="field">
          <label for="customer_name">ឈ្មោះពេញ (តែអក្សរប៉ុណ្ណោះ)</label>
          <input 
            id="customer_name"
            name="customer_name" 
            type="text" 
            placeholder="បញ្ចូលឈ្មោះពេញ" 
            oninput={handleNameInput}
            required 
          />
        </div>

        <div class="field">
          <label for="customer_id_card">អត្តសញ្ញាណប័ណ្ណ (យ៉ាងតិច ៩ ខ្ទង់)</label>
          <input 
            id="customer_id_card"
            name="customer_id_card" 
            type="text" 
            pattern={"[0-9]{9,}"} 
            oninput={handleNumberOnly}
            placeholder="លេខអត្តសញ្ញាណប័ណ្ណ" 
            required 
          />
        </div>

        <div class="field">
          <label for="phone_number">លេខទូរស័ព្ទ (យ៉ាងតិច ៩ ខ្ទង់)</label>
          <input 
            id="phone_number"
            name="phone_number" 
            type="text" 
            pattern={"[0-9]{9,}"} 
            oninput={handleNumberOnly}
            placeholder="បញ្ចូលលេខទូរស័ព្ទ" 
            required 
          />
        </div>

        <div class="field full-width">
          <label for="address">អាសយដ្ឋាន (ស្វែងរកតាមឈ្មោះ ភូមិ ឃុំ ស្រុក ឬខេត្ត)</label>
          <div class="search-container">
            <input 
              id="address" 
              name="address_text" 
              type="text" 
              placeholder="វាយឈ្មោះទីតាំងដើម្បីស្វែងរក..." 
              bind:value={searchQuery}
              oninput={searchAddress}
              required
            />
            
            {#if isShowDropdown && addressResults.length > 0}
              <ul class="results-dropdown">
                {#each addressResults as addr}
                  <li onclick={() => selectAddress(addr)} role="presentation">
                    <span class="main-name">{addr.khmer_name} <small>({addr.type})</small></span>
                    <span class="sub-name">{addr.parent_name || ''}</span>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>
          <input type="hidden" name="address_id" value={selectedAddressId} />
        </div>
      </div>

      <h3 class="section-title">💰 លក្ខខណ្ឌកម្ចី</h3>
      <div class="grid">
        <div class="field">
          <label for="amount_display">ចំនួនប្រាក់ និងប្រភេទលុយ</label>
          <div class="input-group">
            <input 
              id="amount_display"
              type="text" 
              placeholder="0"
              value={formattedAmount}
              oninput={handleAmountInput}
              required 
            />
            <select name="currency_type" bind:value={currencyType} class="currency-select"​ required >
              <option value="1">រៀល</option>
              <option value="2">ដុល្លារ</option>
              <option value="3">លុយរៀលកន្លះខែ</option> 
            </select>
          </div>
          <input type="hidden" name="loan_amount" value={rawAmount} />
        </div>

        <div class="field">
          <label for="interest_rate">អត្រាការប្រាក់ (%)</label>
          <input id="interest_rate" name="interest_rate" type="number" step="0.01" value="0.00" required />
        </div>

        <div class="field">
          <label for="loan_date">កាលបរិច្ឆេទ</label>
          <input id="loan_date" name="loan_date" type="date" value="2026-01-16" required />
        </div>

        <div class="field">
          <label for="loan_term">រយៈពេល (ខែ - តែលេខប៉ុណ្ណោះ)</label>
          <input 
            id="loan_term"
            name="loan_term" 
            type="text" 
            oninput={handleNumberOnly}
            placeholder="បញ្ចូលចំនួនខែ" 
            required
          />
        </div>

        <div class="field">
          <label for="loan_type" required >ប្រភេទកម្ចី</label>
          <select id="loan_type" name="loan_type" required>
            <option value="">-- ជ្រើសរើស --</option>
            <option value="ផ្ទាល់ខ្លួន ">ផ្ទាល់ខ្លួន (Personal)</option>
            <option value="អាជីវកម្ម">អាជីវកម្ម (Business)</option>
          </select>
        </div>

        <div class="field">
          <label for="collateral">ទ្រព្យបញ្ចាំ</label>
          <input id="collateral" name="collateral" type="text" placeholder="បញ្ចូលទ្រព្យបញ្ចាំ"  required />
        </div>
      </div>

      {#if form?.success}
        <div class="status-msg success" transition:fade>
          ✅ រក្សាទុកទិន្នន័យបានជោគជ័យ!
        </div>
      {/if}

      <div class="button-group">
        <button type="submit" class="btn-save">💾 រក្សាទុក</button>
        <a href="/customers" class="btn-list">📋 បញ្ជីអតិថិជន</a>
      </div>
    </form>
  </div>
</div>

<style>
  :global(body) { background-color: #f0f2f5; margin: 0; font-family: 'Khmer OS Battambang', sans-serif; }
  .page-bg { display: flex; justify-content: center; padding: 40px 20px; }
  .card { background: white; width: 100%; max-width: 800px; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); }
  
  .header { background-color: #1a3a8a; color: white; text-align: center; padding: 25px; }
  .header h1 { margin: 0; font-size: 1.5rem; }
  .header p { margin: 5px 0 0; font-size: 0.8rem; opacity: 0.8; letter-spacing: 1px; }

  .content { padding: 30px; }
  .section-title { border-bottom: 2px solid #f1f5f9; padding-bottom: 8px; margin-top: 25px; font-size: 1.05rem; color: #1a3a8a; font-weight: bold; }

  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; }
  .full-width { grid-column: span 2; }

  .field label { display: block; font-size: 0.85rem; margin-bottom: 6px; color: #475569; font-weight: bold; }
  input, select { 
    width: 100%; padding: 11px; border: 1px solid #cbd5e1; border-radius: 8px; box-sizing: border-box; font-size: 0.95rem; transition: all 0.2s ease;
  }
  input:focus, select:focus { outline: none; border-color: #1a3a8a; box-shadow: 0 0 0 3px rgba(26,58,138,0.1); }
  input:read-only { background-color: #f8fafc; color: #64748b; }

  /* Input Group សម្រាប់ដាក់ Input និង Select ក្បែរគ្នា */
  .input-group { display: flex; gap: 8px; }
  .input-group input { flex: 2; }
  .currency-select { flex: 1; min-width: 130px; background-color: #f8fafc; font-weight: bold; color: #1a3a8a; cursor: pointer; }

  .search-container { position: relative; }
  .results-dropdown {
    position: absolute; top: 100%; left: 0; right: 0; background: white; border: 1px solid #cbd5e1;
    border-radius: 0 0 8px 8px; list-style: none; margin: 0; padding: 0; max-height: 200px; overflow-y: auto;
    z-index: 10; box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  }
  .results-dropdown li { padding: 10px 15px; cursor: pointer; border-bottom: 1px solid #f1f5f9; display: flex; flex-direction: column; }
  .results-dropdown li:hover { background-color: #f8fafc; }
  .main-name { font-weight: bold; color: #1a3a8a; font-size: 0.9rem; }
  .sub-name { font-size: 0.75rem; color: #64748b; }

  .button-group { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 35px; }
  .btn-save { background-color: #10b981; color: white; border: none; padding: 13px; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: bold; }
  .btn-save:hover { background-color: #059669; }

  .btn-list { 
    background-color: white; color: #1a3a8a; border: 1.5px solid #1a3a8a; padding: 13px; border-radius: 8px; 
    text-align: center; text-decoration: none; font-size: 1rem; font-weight: bold; 
  }
  .status-msg.success { 
    background-color: #dcfce7; color: #15803d; padding: 12px; border-radius: 8px; text-align: center; 
    font-weight: bold; margin-top: 20px; border: 1px solid #bbf7d0;
  }

  @media (max-width: 600px) {
    .grid { grid-template-columns: 1fr; }
    .full-width { grid-column: span 1; }
    .button-group { grid-template-columns: 1fr; }
    .input-group { flex-direction: row; }
  }
</style>