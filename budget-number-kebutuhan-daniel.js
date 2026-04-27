/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/log', 'N/record', 'N/search', 'N/runtime'], (log, record, search, runtime) => {
    const ambilDaftarData = (context) => {
        try {
            log.debug('Memulai Proses', 'Mengambil daftar data Budget...');
            var pencarianDataBudget;
            if (context.recordId) {
                pencarianDataBudget = search.create({ type: 'customrecord_bi_budgetnumber', filters: [['isinactive', 'is', 'F'], 'AND', ['internalidnumber', 'greaterthan', context.recordId]], columns: ['internalid', search.createColumn({ name: 'created', sort: search.Sort.ASC })] });
            } else {
                pencarianDataBudget = search.create({ type: 'customrecord_bi_budgetnumber', filters: [['isinactive', 'is', 'F']], columns: [search.createColumn({ name: 'internalid', sort: search.Sort.ASC })] });
            }
            const hasilList = [];
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
            log.debug('Selesai', `Ditemukan ${hasilList.length} data.`);
            return payload;
        } catch (e) {
            log.error('Gagal Ambil List', e.message);
            return { error: true, pesan: 'Ada kendala saat mengambil data: ' + e.message };
        }
    }
    return { get: ambilDaftarData };
});