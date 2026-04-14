/**
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/file'], (file) => {
    const beforeLoad = (context) => {
        if (context.type === context.UserEventType.VIEW) {
            let form = context.form;
            let rec = context.newRecord;

            form.clientScriptModulePath = '../SuiteScripts/so_client_nawaf.js';

            form.addButton({
                id: 'custpage_sync_lark',
                label: 'Sync to Lark wap',
                functionName: `syncToLark(${rec.id}, '${rec.type}')`
            });
        }
    };

    return { beforeLoad: beforeLoad };
});