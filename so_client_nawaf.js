/**
 * @NApiVersion 2.1
 * @NScriptType ClientScript
 */
define(['N/https', 'N/ui/dialog', 'N/record'], (https, dialog, record) => {

    function pageInit() {}

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        const day = String(d.getUTCDate()).padStart(2, '0');
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const year = String(d.getUTCFullYear()).slice(-2);
        return day + '/' + month + '/' + year;
    }

    const syncToLark = (recordId, recordType) => {
        dialog.confirm({
            title: 'Synchronize',
            message: 'Kirim data Sales Order ini ke Lark?'
        }).then((result) => {
            if (result) {
                let rec = record.load({ type: recordType, id: recordId });
                let lineCount = rec.getLineCount({ sublistId: 'item' });
                let lineItems = [];
                let subtotal = 0;
                let discount = 0;

                for (let i = 0; i < lineCount; i++) {
                    let itemType = rec.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: i });
                    let amount = Number(rec.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i }));

                    if (itemType === 'Subtotal') {
                        subtotal = amount;
                        continue;
                    }

                    if (itemType === 'Discount') {
                        discount = amount;
                        continue;
                    }

                    lineItems.push({
                        item: rec.getSublistText({ sublistId: 'item', fieldId: 'item', line: i }),
                        quantity: Number(rec.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i })),
                        description: String(rec.getSublistValue({ sublistId: 'item', fieldId: 'description', line: i })),
                        unit_price: Number(rec.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i })),
                        amount: amount,
                        rev_rec_schedule: rec.getSublistText({ sublistId: 'item', fieldId: 'revrecschedule', line: i }) || '',
                        rev_rec_start_date: formatDate(rec.getSublistValue({ sublistId: 'item', fieldId: 'revrecstartdate', line: i })),
                        rev_rec_end_date: formatDate(rec.getSublistValue({ sublistId: 'item', fieldId: 'revrecenddate', line: i }))
                    });
                }

                let payload = {
                    netsuite_id: recordId,
                    order_number: rec.getValue({ fieldId: 'tranid' }),
                    customer: rec.getText({ fieldId: 'entity' }),
                    date: rec.getValue({ fieldId: 'trandate' }),
                    status: rec.getValue({ fieldId: 'status' }),
                    total: Number(rec.getValue({ fieldId: 'total' })),
                    subtotal: subtotal || Number(rec.getValue({ fieldId: 'total' })),
                    discount: discount,
                    subsidiary: rec.getText({ fieldId: 'subsidiary' }),
                    memo: rec.getValue({ fieldId: 'memo' }),
                    sales_rep: rec.getText({ fieldId: 'salesrep' }),
                    line_items: lineItems
                };

                https.post({
                    url: 'https://open-sg.larksuite.com/anycross/trigger/callback/NTJjYmExMmRiZmRmM2JmZmEyMmE2MDlhYzE4YTU3NDgw',
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