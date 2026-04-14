/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/https', 'N/ui/dialog', 'N/record'], (https, dialog, record) => {

    function pageInit() {}

    const syncToLark = (recordId, recordType) => {
        dialog.confirm({
            title: 'Synchronize',
            message: 'Kirim data Sales Order ini ke Lark?'
        }).then((result) => {
            if (result) {
                let rec = record.load({ type: recordType, id: recordId });
                let lineCount = rec.getLineCount({ sublistId: 'item' });
                let lineItems = [];

                for (let i = 0; i < lineCount; i++) {
                    lineItems.push({
                        item: rec.getSublistText({ sublistId: 'item', fieldId: 'item', line: i }),
                        quantity: Number(rec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i })),
                        description: String(rec.getSublistValue({ sublistId: 'item', fieldId: 'description', line: i })),
                        rate: Number(rec.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i })),
                        amount: Number(rec.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i }))
                    });
                }

                let payload = {
                    netsuite_id: recordId,
                    order_number: rec.getValue({ fieldId: 'tranid' }),
                    customer: rec.getText({ fieldId: 'entity' }),
                    date: rec.getValue({ fieldId: 'trandate' }),
                    status: rec.getValue({ fieldId: 'status' }),
                    total: Number(rec.getValue({ fieldId: 'total' })),
                    subsidiary: rec.getText({ fieldId: 'subsidiary' }),
                    memo: rec.getValue({ fieldId: 'memo' }),
                    sales_rep: rec.getText({ fieldId: 'salesrep' }),
                    line_items: lineItems
                };

                https.post({
                    url: 'https://open-sg.larksuite.com/anycross/trigger/callback/MDYzMDRjZGZlN2I0ZWExZjI2ZjhkNTA3OTg5ZTUxY2Nm',
                    body: JSON.stringify(payload),
                    headers: { 'Content-Type': 'application/json' }
                });

                dialog.alert({
                    title: 'Success',
                    message: 'Data Sales Order berhasil disinkronkan ke Lark!'
                });
            }
        });
    };

    return { pageInit: pageInit, syncToLark: syncToLark };
});