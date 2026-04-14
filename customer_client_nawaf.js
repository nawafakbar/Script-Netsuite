/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/https', 'N/ui/dialog', 'N/record', 'N/log'], (https, dialog, record, log) => {
    
    function pageInit() {}

    const syncToLark = (recordId, recordType) => {
        // 1. Bikin variabel nama record biar pesan dialognya dinamis
        const recordNameDisplay = recordType === 'customer' ? 'Customer' : 'Subsidiary';

        dialog.confirm({
            title: 'Synchronize',
            message: `Kirim data ${recordNameDisplay} ini ke Lark?`
        }).then((result) => {
            if (result) {
                let rec = record.load({ type: recordType, id: recordId });
                let payload = {};

                // 2. Bikin logika percabangan untuk payload
                if (recordType === 'customer') {
                    payload = {
                        netsuite_id: String(recordId),
                        consumer_name: rec.getValue({ fieldId: 'companyname' }) || rec.getValue({ fieldId: 'entityid' }),
                        email: rec.getValue({ fieldId: 'email' }),
                        phone: rec.getValue({ fieldId: 'phone' }),
                        address: rec.getValue({ fieldId: 'defaultaddress' }),
                        subsidiary: rec.getText({ fieldId: 'subsidiary' }),
                        type: 'customer',
                        sync_status: 'success'
                    };
                    } else if (recordType === 'subsidiary') {
                        // Tarik raw data alamat
                        let rawAddress = rec.getValue({ fieldId: 'mainaddress_text' }) || '';
                        
                        // Bersihkan tag <br> menjadi enter (\n) biar rapi pas masuk Lark
                        let cleanAddress = rawAddress.replace(/<br>/gi, '\n');

                        payload = {
                            netsuite_id: String(recordId),
                            consumer_name: rec.getValue({ fieldId: 'name' }), 
                            email: rec.getValue({ fieldId: 'email' }) || '',
                            phone: '', // Di record ini kosong, kita kirim string kosong aja
                            address: cleanAddress, // Masukkan alamat yang sudah bersih
                            subsidiary: rec.getValue({ fieldId: 'name' }), 
                            type: 'subsidiary',
                            sync_status: 'success'
                        };
                    }

                // 3. Kirim via AnyCross Webhook
                https.post({
                    url: 'https://open-sg.larksuite.com/anycross/trigger/callback/MGVmMzEzNGZlMDllZmVkYjRmYzJlZTNiMzc2ODkyOTVh',
                    body: JSON.stringify(payload),
                    headers: { 'Content-Type': 'application/json' }
                });

                dialog.alert({
                    title: 'Success',
                    message: `Data ${recordNameDisplay} berhasil disinkronkan ke Lark!`
                });
            }
        });
    };

    return { pageInit: pageInit, syncToLark: syncToLark };
});