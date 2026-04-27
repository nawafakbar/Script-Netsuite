/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/log', 'N/record', 'N/search', 'N/runtime'], (log, record, search, runtime) => {
    
    const ambilDaftarData = (context) => {
        try {
            // Mengambil parameter &searchid=... dari Python
            var searchIdTarget = context.searchid || "customsearch1341";
            
            log.audit('Memulai Proses', 'Mengambil data dari Search: ' + searchIdTarget);
            
            // load saved search
            var mySearch = search.load({ id: searchIdTarget });
            var columns = mySearch.columns;
            var csvContent = "";
            var headers = [];
            
            // susun header csv
            mySearch.columns.forEach(function(col) {
                headers.push(col.label || col.name);
            });
            csvContent += headers.join(",") + "\n";
            
            // pagination (Batas 1000 baris per eksekusi)
            var searchResult = mySearch.run();
            var end = "";
            var results = "";
            
            if (!context.end) {
                results = searchResult.getRange({ start: 0, end: 1000 });
                end = 1000;
            } else {
                var start = Number(context.end);
                end = start + 1000;
                results = searchResult.getRange({ start: start, end: end });
                
                // Cek apakah hasil kosong di range ini
                if (!results || results.length === 0) {
                    end = 0;
                }
            }
            
            // ekstrak ke dalam format csv
            if (results && results.length > 0) {
                for (var i = 0; i < results.length; i++) {
                    var row = [];
                    var result = results[i];
                    
                    for (var j = 0; j < columns.length; j++) {
                        var col = columns[j];
                        var val = result.getText(col) || result.getValue(col) || "";
                        
                        // Bersihkan koma dan enter dari isi data agar CSV tidak hancur
                        if (typeof val === 'string') {
                            val = val.replace(/,/g, '').replace(/\r?\n|\r/g, ' ');
                        }
                        row.push(val);
                    }
                    csvContent += row.join(",") + "\n";
                }
                
                // Return string CSV langsung (akan dibaca response.text oleh Python)
                return csvContent;
                
            } else {
                // ketika data habis
                // Karena tidak ada perintah 'return' di blok ini, NetSuite akan melempar 
                // error 400 "INVALID_RETURN_DATA_FORMAT".
                log.audit("Selesai", "Seluruh baris data dari " + searchIdTarget + " sudah berhasil ditarik.");
            }
            
        } catch(e) {
            log.error('Gagal Ambil List', e.message);
            // Kembalikan error message jika terjadi kegagalan sistem
            return "Error: " + e.message;
        }
    }
    
    // Daftarkan fungsi ke method GET
    return { get: ambilDaftarData };
});