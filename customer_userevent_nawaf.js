/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define([], () => {
    const beforeLoad = (context) => {
        if (context.type === context.UserEventType.VIEW) {
            let form = context.form;
            let rec = context.newRecord;

            form.clientScriptModulePath = './customer_client_nawaf.js';

            form.addButton({
                id: 'custpage_sync_lark',
                label: 'Synchronize to Lark',
                functionName: `syncToLark(${rec.id}, '${rec.type}')`
            });
        }
    };

    return { beforeLoad: beforeLoad };
});