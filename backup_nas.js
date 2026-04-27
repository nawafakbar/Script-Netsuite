/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/log', 'N/record', 'N/search', 'N/runtime'], (log, record, search, runtime) => {

    // --- 1. ROUTER UTAMA ---
    function doGet(requestParams) {
        var type = requestParams.type;
        var id = requestParams.id;

        if (type === 'budgetnumber') {
            return getBudgetNumbers(id);
        } 
        // Tambahkan route baru untuk tipe 'savedsearch_csv'
        else if (type === 'savedsearch_csv') {
            // Kita parsing seluruh requestParams karena butuh parameter 'end' untuk pagination
            return getSavedSearchCSV(requestParams);
        }
        else {
            return { error: 'type parameter tidak dikenali. Gunakan: budgetnumber, savedsearch_csv' };
        }
    }

    // --- 2. FUNCTION HANDLER: BUDGET NUMBER ---
    function getBudgetNumbers(recordId) {
        try {
            log.debug('Memulai Proses', 'Mengambil daftar data Budget...');
            var pencarianDataBudget;
            
            // Jika ada parameter ID, ambil ID yang lebih besar dari ID tersebut
            if (recordId) {
                pencarianDataBudget = search.create({ 
                    type: 'customrecord_bi_budgetnumber', 
                    filters: [['isinactive', 'is', 'F'], 'AND', ['internalidnumber', 'greaterthan', recordId]], 
                    columns: ['internalid', search.createColumn({ name: 'created', sort: search.Sort.ASC })] 
                });
            } else {
                pencarianDataBudget = search.create({ 
                    type: 'customrecord_bi_budgetnumber', 
                    filters: [['isinactive', 'is', 'F']], 
                    columns: [search.createColumn({ name: 'internalid', sort: search.Sort.ASC })] 
                });
            }
            
            var index = 0;
            let payload = [];
            
            pencarianDataBudget.run().each((baris) => {
                log.audit("nomor", index++);
                let budgetNumberId = baris.getValue('internalid');
                let recBN = record.load({ type: "customrecord_bi_budgetnumber", id: budgetNumberId });
                
                var budgetSearchBIP = search.create({ type: 'customrecord_bi_budgetitemparent', filters: [['custrecord_bi_bip_budgetnumber', 'is', budgetNumberId]], columns: ['internalid'] });
                var searchResultsBIP = budgetSearchBIP.run().getRange({ start: 0, end: 1000 });
                var indexBIP = 0;
                var tampungBIP = [];
                
                searchResultsBIP.forEach(function(resultBIP) {
                    if (runtime.getCurrentScript().getRemainingUsage() >= 100) {
                        indexBIP += 1;
                        var internalIdBIP = resultBIP.getValue('internalid');
                        var tampungBID = [];
                        let recBIP = record.load({ type: 'customrecord_bi_budgetitemparent', id: internalIdBIP });
                        
                        var budgetSearchBID = search.create({ type: 'customtransaction_bid_pd_itemdetail', filters: [['custbody_bi_budgetitemparent', 'is', internalIdBIP]], columns: ['internalid'] });
                        var searchResultsBID = budgetSearchBID.run().getRange({ start: 0, end: 1000 });
                        var indexBID = 0;
                        
                        searchResultsBID.forEach(function(resultBID) {
                            if (runtime.getCurrentScript().getRemainingUsage() >= 100) {
                                indexBID += 1;
                                var internalIdBID = resultBID.getValue('internalid');
                                let recBID = record.load({ type: 'customtransaction_bid_pd_itemdetail', id: internalIdBID });
                                tampungBID.push({indexbid: indexBID, rec: recBID});
                                return true;
                            }
                        });
                        
                        tampungBIP.push({indexparent: indexBIP, parent: recBIP, parentdetail: tampungBID});
                        return true;
                    }
                });
                
                if (runtime.getCurrentScript().getRemainingUsage() >= 100) {
                    payload.push({budgetnumber: recBN, budgetparent: tampungBIP});
                    return true;
                }
            });
            
            log.debug('Selesai', `Ditemukan ${payload.length} data.`);
            
            return { 
                type: 'budgetnumber', 
                count: payload.length, 
                data: payload 
            };
            
        } catch (e) {
            log.error('Gagal Ambil List', e.message);
            return { error: true, pesan: 'Ada kendala saat mengambil data: ' + e.message };
        }
    }

    // --- 3. FUNCTION HANDLER BARU: SAVED SEARCH CSV ---
    function getSavedSearchCSV(params) {
        try {
            log.audit('Memulai Proses', 'Mengambil daftar data Transaksi...');
            var mySearch = search.load({ id: "customsearch1341" });
            var columns = mySearch.columns;
            var csvContent = "";
            var headers = [];
            
            log.audit("mySearch loaded", mySearch.searchType);
            
            mySearch.columns.forEach(function(col) {
                headers.push(col.label || col.name);
            });
            csvContent += headers.join(",") + "\n";
            
            var searchResult = mySearch.run();
            var endPoint = "";
            var results = "";
            
            // Logika Pagination menggunakan params.end
            if (!params.end) {
                results = searchResult.getRange({ start: 0, end: 1000 });
                endPoint = 1000;
            } else {
                var start = Number(params.end);
                endPoint = start + 1000;
                results = searchResult.getRange({ start: start, end: endPoint });
                if (!results || results.length === 0) {
                    endPoint = 0; // Penanda kalau data sudah habis
                }
            }
            
            log.audit("check results length", results ? results.length : 0);
            
            if (results && results.length > 0) {
                for (var i = 0; i < results.length; i++) {
                    var row = [];
                    var result = results[i];
                    for (var j = 0; j < columns.length; j++) {
                        var col = columns[j];
                        var val = result.getText(col) || result.getValue(col) || "";
                        // Format CSV: bersihkan koma dan enter dari isi data
                        if (typeof val === 'string') {
                            val = val.replace(/,/g, '').replace(/\r?\n|\r/g, ' ');
                        }
                        row.push(val);
                    }
                    csvContent += row.join(",") + "\n";
                }
                
                // KEMBALIKAN SEBAGAI JSON AGAR BISA MEMBAWA NILAI 'end'
                return {
                    type: 'savedsearch_csv',
                    status: 'success',
                    next_end: endPoint, // Client harus pakai nilai ini untuk parameter 'end' selanjutnya
                    data_csv: csvContent
                };
            } else {
                log.error("No Data", "Search berhasil di-load tapi tidak ada baris yang ditemukan.");
                return { status: 'empty', message: 'Tidak ada data ditemukan untuk range tersebut.' };
            }
        } catch(e) {
            log.error('Gagal Ambil List', e.message);
            return { error: true, pesan: 'Ada kendala saat mengambil data: ' + e.message };
        }
    }

    // --- 4. EXPORT MODULE ---
    return { 
        get: doGet 
    };
});