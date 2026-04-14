/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/query', 'N/search', 'N/record'], function(query, search, record) {

    function doGet(requestParams) {
        var type = requestParams.type;
        var id = requestParams.id;

        if (type === 'employee') {
            return id ? getEmployeetById(id) : getEmployees();
        } else if (type === 'department') {
            return id ? getDepartmentById(id) : getDepartments();
        } else if (type === 'customer') {
            return id ? getCustomerById(id) : getCustomers();
        } else if (type === 'project') {
            return id ? getProjectById(id) : getProjects();
        } else if (type === 'salesorder') {
            return id ? getSalesOrderById(id) : getSalesOrders();
        } else if (type === 'solineitems') {
            return id ? getSOLineItemsById(id) : getSalesOrders();
        } else if (type === 'purchaseorder') {
            return id ? getPurchaseOrderById(id) : getPurchaseOrders();
        } else {
            return { error: 'type parameter tidak dikenali. Gunakan: employee, department, customer, project' };
        }
    }

    function doPost(requestBody) {
        try {
            var type = requestBody.type;
            if (type === 'customer') {
                return createCustomer(requestBody);
            } else if (type === 'project') {
                return createProject(requestBody);
            } else if (type === 'employee') {
                return createEmployee(requestBody);
            } else if (type === 'department') {
                return createDepartment(requestBody);
            } else {
                return {error: 'type parameter tidak dikenali, Gunakan: Employee, department, customer, project'};
            }
        } catch (e) {
            return { error: e.message };
        }
    }

    function doPut(requestBody) {
        try {
            var type = requestBody.type;
        var id = requestBody.id;

        if (!id) return { error: 'field id wajib diisi untuk update!'};
        if (!type) return { error: 'field type wajib diisi untuk update!'};

        if (type === 'customer') {
            return updateCustomer(requestBody);
        } else if (type === 'department') {
            return updateDepartment(requestBody);
        } else if (type === 'project') {
            return updateProject(requestBody);
        } else if (type === 'employee') {
            return updateEmployee(requestBody);
        } else {
            return {error: 'type parameter tidak dikenali, Gunakan: Employee, department, customer, project'};
        }
        } catch (e) {
            return { error: e.message };
        }
    }

    function doDelete(requestParams) {
        try {
            var type = requestParams.type;
            var id = requestParams.id;

            if (!id) return { error: 'Field id wajib diisi untuk delete!' };
            if (!type) return { error: 'Field type wajib diisi untuk delete!' };

            if (type === 'customer') {
                record.delete({ type: record.Type.CUSTOMER, id: id });
                return { success: true, message: 'Customer ID ' + id + ' berhasil dihapus!' };
            } else if (type === 'project') {
                record.delete({ type: record.Type.JOB, id: id });
                return { success: true, message: 'Project ID ' + id + ' berhasil dihapus!' };
            } else if (type === 'employee') {
                record.delete({ type: record.Type.EMPLOYEE, id: id });
                return { success: true, message: 'Employee ID ' + id + ' berhasil dihapus!' };
            } else if (type === 'department') {
                record.delete({ type: record.Type.DEPARTMENT, id: id });
                return { success: true, message: 'Department ID ' + id + ' berhasil dihapus!' };
            } else {
                return { error: 'type tidak dikenali. Gunakan: customer, project, employee, department' };
            }
        } catch(e) {
            return { error: e.message };
        }
    }

    // Get Employees pakai Search
    function getEmployees() {
        try {
            var results = [];
            var s = search.create({
                type: 'employee',
                filters: [
                    ['isinactive', 'is', 'F']
                ],
                columns: [
                    { name: 'internalid' },
                    { name: 'entityid' },
                    { name: 'email' }
                ]
            });

            s.run().each(function(result) {
                results.push({
                    id: result.getValue({ name: 'internalid' }),
                    name: result.getValue({ name: 'entityid' }),
                    email: result.getValue({ name: 'email' })
                });
                return true;
            });
            return { type: 'employee', count: results.length, data: results };
        } catch(e) {
            return { error: e.message };
        }
    }

    // Get Departments pakai SuiteQL
    function getDepartments() {
        try {
            var results = [];
            var suiteQL = "SELECT d.id, d.name " +
                         "FROM Department d " +
                         "WHERE d.isinactive = 'F' " +
                         "ORDER BY d.name";

            var resultSet = query.runSuiteQL({ query: suiteQL });
            resultSet.results.forEach(function(row) {
                results.push({
                    id: row.values[0],
                    name: row.values[1]
                });
            });
            return { type: 'department', count: results.length, data: results };
        } catch(e) {
            return { error: e.message };
        }
    }

    // Get Customers pakai SuiteQL
    function getCustomers() {
        try {
            var results = [];
            var suiteQL = "SELECT c.id, c.companyname, c.email, c.phone " +
                         "FROM Customer c " +
                         "WHERE c.isinactive = 'F' " +
                         "ORDER BY c.companyname";

            var resultSet = query.runSuiteQL({ query: suiteQL });
            resultSet.results.forEach(function(row) {
                results.push({
                    id: row.values[0],
                    companyName: row.values[1],
                    email: row.values[2],
                    phone: row.values[3]
                });
            });
            return { type: 'customer', count: results.length, data: results };
        } catch(e) {
            return { error: e.message };
        }
    }

    // Get Projects pakai SuiteQL
    function getProjects() {
        try {
            var results = [];
            var suiteQL = "SELECT j.id, j.companyname " +
                        "FROM Job j " +
                        "WHERE j.isinactive = 'F' " +
                        "ORDER BY j.companyname";

            var resultSet = query.runSuiteQL({ query: suiteQL });
            resultSet.results.forEach(function(row) {
                results.push({
                    id: row.values[0],
                    projectName: row.values[1]
                });
            });
            return { type: 'project', count: results.length, data: results };
        } catch(e) {
            return { error: e.message };
        }
    }

    // Get All Sales Orders pakai SuiteSQL
    function getSalesOrders() {
        try {
            var statusMap = {
                'A': 'Pending Approval',
                'B': 'Pending Fulfillment',
                'C': 'Cancelled',
                'D': 'Partially Fulfilled',
                'E': 'Pending Billing/Partially Fulfilled',
                'F': 'Pending Billing',
                'G': 'Billed',
                'H': 'Closed'
            };

            var results = [];
            var suiteQL = "SELECT t.id, t.tranid, t.trandate, " +
                "c.companyname AS customer_name, " +
                "emp.entityid AS salesrep_name, " +
                "t.status, t.total, t.memo, t.subsidiary " +
                "FROM salesOrder t " +
                "LEFT JOIN Customer c ON t.entity = c.id " +
                "LEFT JOIN Employee emp ON t.salesrep = emp.id " +
                "WHERE t.voided = 'F' " +
                "ORDER BY t.trandate DESC";

            var resultSet = query.runSuiteQL({ query: suiteQL });
            resultSet.results.forEach(function(row) {
                var rawStatus = row.values[5];
                results.push({
                    netsuite_id: row.values[0],
                    order_number: row.values[1],
                    date: row.values[2],
                    customer: row.values[3],
                    sales_rep: row.values[4],
                    status: statusMap[rawStatus] || rawStatus,
                    total: row.values[6],
                    memo: row.values[7],
                    subsidiary: row.values[8]
                });
            });
            return { type: 'salesorder', count: results.length, data: results };
        } catch(e) {
            return { error: e.message };
        }
    }

    //Get All PO pakai SuiteSQL
    function getPurchaseOrders() {
        try {
            var statusMap = {
                'A': 'Pending Supervisor Approval',
                'B': 'Pending Receipt',
                'C': 'Rejected',
                'D': 'Partially Received',
                'E': 'Pending Billing/Partially Received',
                'F': 'Pending Bill',
                'G': 'Fully Billed',
                'H': 'Closed'
            };

            var results = [];
            var suiteQL = "SELECT t.id, t.tranid, t.trandate, " +
                "v.companyname AS vendor_name, " +
                "t.status, t.total, t.memo " +
                "FROM PurchaseOrder t " +
                "LEFT JOIN Vendor v ON t.entity = v.id " +
                "WHERE t.voided = 'F' " +
                "ORDER BY t.trandate DESC";

            var queryResults = query.runSuiteQL({ query: suiteQL }).asMappedResults();
            queryResults.forEach(function(row) {
                results.push({
                    netsuite_id: row.id,
                    po_number: row.tranid,
                    date: row.trandate,
                    vendor: row.vendor_name,
                    status: statusMap[row.status] || row.status,
                    total: row.total,
                    memo: row.memo
                });
            });
            return { type: 'purchaseorder', count: results.length, data: results };
        } catch(e) {
            return { error: e.message };
        }
    }

    // Get PO by ID
    function getPurchaseOrderById(id) {
        try {
            var poRecord = record.load({
                type: record.Type.PURCHASE_ORDER,
                id: id
            });

            var lineItems = [];
            var lineCount = poRecord.getLineCount({ sublistId: 'item' });

            for (var i = 0; i < lineCount; i++) {
                lineItems.push({
                    item: poRecord.getSublistText({ sublistId: 'item', fieldId: 'item', line: i }),
                    description: poRecord.getSublistValue({ sublistId: 'item', fieldId: 'description', line: i }),
                    qty_ordered: Number(poRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i })),
                    qty_received: Number(poRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantityreceived', line: i })),
                    qty_billed: Number(poRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantitybilled', line: i })),
                    unit_price: Number(poRecord.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i })),
                    amount: Number(poRecord.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i }))
                });
            }

            return {
                type: 'purchaseorder',
                data: {
                    netsuite_id: poRecord.id,
                    po_number: poRecord.getValue({ fieldId: 'tranid' }),
                    date: poRecord.getValue({ fieldId: 'trandate' }),
                    vendor: poRecord.getText({ fieldId: 'entity' }),
                    status: poRecord.getText({ fieldId: 'status' }),
                    total: Number(poRecord.getValue({ fieldId: 'total' })),
                    line_items: lineItems
                }
            };
        } catch(e) {
            return { error: e.message };
        }
    }

    // Get Sales Order by ID
    function getSalesOrderById(id) {
        try {
            var soRecord = record.load({
                type: record.Type.SALES_ORDER,
                id: id
            });

            var lineCount = soRecord.getLineCount({ sublistId: 'item' });
            var subtotal = 0;
            var discount = 0;
            var lineItems = [];

            for (var i = 0; i < lineCount; i++) {
                var itemType = soRecord.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: i });
                var amount = Number(soRecord.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i }));

                if (itemType === 'Subtotal') {
                    subtotal = amount;
                    continue;
                }
                if (itemType === 'Discount') {
                    discount = amount;
                    continue;
                }

                lineItems.push({
                    item: soRecord.getSublistText({ sublistId: 'item', fieldId: 'item', line: i }),
                    description: String(soRecord.getSublistValue({ sublistId: 'item', fieldId: 'description', line: i })),
                    quantity: Number(soRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i })),
                    unit_price: Number(soRecord.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i })),
                    amount: amount,
                    rev_rec_schedule: soRecord.getSublistText({ sublistId: 'item', fieldId: 'revrecschedule', line: i }) || '',
                    rev_rec_start_date: soRecord.getSublistValue({ sublistId: 'item', fieldId: 'revrecstartdate', line: i }) || null,
                    rev_rec_end_date: soRecord.getSublistValue({ sublistId: 'item', fieldId: 'revrecenddate', line: i }) || null,
                    so_header_id: id
                });
            }

            return {
                type: 'salesorder',
                data: {
                    netsuite_id: soRecord.id,
                    order_number: soRecord.getValue({ fieldId: 'tranid' }),
                    date: soRecord.getValue({ fieldId: 'trandate' }),
                    customer: soRecord.getText({ fieldId: 'entity' }),
                    sales_rep: soRecord.getText({ fieldId: 'salesrep' }),
                    status: soRecord.getValue({ fieldId: 'status' }),
                    subtotal: subtotal || Number(soRecord.getValue({ fieldId: 'total' })),
                    discount: discount,
                    total: Number(soRecord.getValue({ fieldId: 'total' })),
                    memo: soRecord.getValue({ fieldId: 'memo' }),
                    subsidiary: soRecord.getText({ fieldId: 'subsidiary' }),
                    line_items: lineItems
                }
            };
        } catch(e) {
            return { error: e.message };
        }
    }

    // Get SO Line Items by SO ID
    function getSOLineItemsById(id) {
        try {
            var soRecord = record.load({
                type: record.Type.SALES_ORDER,
                id: id
            });

            var lineItems = [];
            var lineCount = soRecord.getLineCount({ sublistId: 'item' });

            for (var i = 0; i < lineCount; i++) {
                lineItems.push({
                    item: soRecord.getSublistText({ sublistId: 'item', fieldId: 'item', line: i }),
                    description: soRecord.getSublistValue({ sublistId: 'item', fieldId: 'description', line: i }),
                    quantity: soRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i }),
                    unit_price: soRecord.getSublistValue({ sublistId: 'item', fieldId: 'price', line: i }),
                    rate: soRecord.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i }),
                    amount: soRecord.getSublistValue({ sublistId: 'item', fieldId: 'amount', line: i }),
                    rev_rec_schedule: soRecord.getSublistText({ sublistId: 'item', fieldId: 'revrecschedule', line: i }),
                    rev_rec_start_date: soRecord.getSublistValue({ sublistId: 'item', fieldId: 'revrecstartdate', line: i }),
                    rev_rec_end_date: soRecord.getSublistValue({ sublistId: 'item', fieldId: 'revrecenddate', line: i }),
                    so_header_id: id
                });
            }

            return {
                type: 'solineitems',
                so_id: id,
                count: lineItems.length,
                data: lineItems
            };
        } catch(e) {
            return { error: e.message };
        }
    }

    // POST Create Customer
    function createCustomer(data) {
        var r = record.create({ type: record.Type.CUSTOMER, isDynamic: true });
        if (data.companyName) r.setValue({ fieldId: 'companyname', value: data.companyName });
        if (data.email) r.setValue({ fieldId: 'email', value: data.email });
        if (data.phone) r.setValue({ fieldId: 'phone', value: data.phone });
        if (data.subsidiary) r.setValue({ fieldId: 'subsidiary', value: data.subsidiary });
        var newId = r.save();
        return { success: true, message: 'Customer berhasil dibuat!', id: newId };
    }

    // POST Create Department
    function createDepartment(data) {
        var r = record.create({ type: record.Type.DEPARTMENT, isDynamic: true });
        if (data.name) r.setValue({ fieldId: 'name', value: data.name });
        if (data.subsidiary) r.setValue({ fieldId: 'subsidiary', value: data.subsidiary });
        var newId = r.save();
        return { success: true, message: 'Department berhasil dibuat!', id: newId };
    }

    // POST Create Project
    function createProject(data) {
        var r = record.create({ type: record.Type.JOB, isDynamic: true });
        if (data.projectName) r.setValue({ fieldId: 'companyname', value: data.projectName });
        if (data.customer) r.setValue({ fieldId: 'parent', value: data.customer });
        if (data.projectExpenseType) r.setValue({ fieldId: 'projectexpensetype', value: data.projectExpenseType });
        if (data.subsidiary) r.setValue({ fieldId: 'subsidiary', value: data.subsidiary });
        var newId = r.save();
        return { success: true, message: 'Project berhasil dibuat!', id: newId };
    }

    // POST Create Employee
    function createEmployee(data) {
        var r = record.create({ type: record.Type.EMPLOYEE, isDynamic: true });
        if (data.firstName) r.setValue({ fieldId: 'firstname', value: data.firstName });
        if (data.lastName) r.setValue({ fieldId: 'lastname', value: data.lastName });
        if (data.email) r.setValue({ fieldId: 'email', value: data.email });
        if (data.subsidiary) r.setValue({ fieldId: 'subsidiary', value: data.subsidiary });
        var newId = r.save();
        return { success: true, message: 'Employee berhasil dibuat!', id: newId };
    }

    // PUT Customer
    function updateCustomer(data) {
        var r = record.load({ type: record.Type.CUSTOMER, id: data.id, isDynamic: true });
        if (data.companyName) r.setValue({ fieldId: 'companyname', value: data.companyName });
        if (data.email) r.setValue({ fieldId: 'email', value: data.email });
        if (data.phone) r.setValue({ fieldId: 'phone', value: data.phone });
        var updatedId = r.save();
        return { success: true, message: 'Customer berhasil diupdate!', id: updatedId };
    }

    // PUT Project
    function updateProject(data) {
        var r = record.load({ type: record.Type.JOB, id: data.id, isDynamic: true });
        if (data.projectName) r.setValue({ fieldId: 'companyname', value: data.projectName });
        if (data.customer) r.setValue({ fieldId: 'parent', value: data.customer });
        var updatedId = r.save();
        return { success: true, message: 'Project berhasil diupdate!', id: updatedId };
    }

    // PUT Department
    function updateDepartment(data) {
        var r = record.load({ type: record.Type.DEPARTMENT, id: data.id, isDynamic: true });
        if (data.name) r.setValue({ fieldId: 'name', value: data.name });
        var updatedId = r.save();
        return { success: true, message: 'Department berhasil diupdate!', id: updatedId };
    }

    // PUT Employee
    function updateEmployee(data) {
        var r = record.load({ type: record.Type.EMPLOYEE, id: data.id, isDynamic: true });
        if (data.firstName) r.setValue({ fieldId: 'firstname', value: data.firstName });
        if (data.lastName) r.setValue({ fieldId: 'lastname', value: data.lastName });
        if (data.email) r.setValue({ fieldId: 'email', value: data.email });
        var updatedId = r.save();
        return { success: true, message: 'Employee berhasil diupdate!', id: updatedId };
    }

    // Get Customer by ID
    function getCustomerById(id) {
        try {
            var customerRecord = record.load({
                type: record.Type.CUSTOMER,
                id: id
            });
            return {
                type: 'customer',
                data: {
                    id: customerRecord.id,
                    companyName: customerRecord.getValue({ fieldId: 'companyname' }),
                    email: customerRecord.getValue({ fieldId: 'email' }),
                    phone: customerRecord.getValue({ fieldId: 'phone' }),
                    subsidiary: customerRecord.getText({ fieldId: 'subsidiary' })
                }
            };
        } catch(e) {
            return { error: e.message };
        }
    }

    // Get Project by ID
    function getProjectById(id) {
        try {
            var projectRecord = record.load({
                type: record.Type.JOB,
                id: id
            });
            return {
                type: 'project',
                data: {
                    id: projectRecord.id,
                    projectName: projectRecord.getValue({ fieldId: 'companyname' }),
                    customer: projectRecord.getText({ fieldId: 'customer' })
                }
            };
        } catch(e) {
            return { error: e.message };
        }
    }

    // Get Department by ID
    function getDepartmentById(id) {
        try {
            var departmentRecord = record.load({
                type: record.Type.DEPARTMENT,
                id: id
            });
            return {
                type: 'department',
                data: {
                    id: departmentRecord.id,
                    departmentName: departmentRecord.getValue({ fieldId: 'name' })
                }
            };
        } catch(e) {
            return { error: e.message };
        }
    }

    // Get Employee by ID
    function getEmployeetById(id) {
        try {
            var employeeRecord = record.load({
                type: record.Type.EMPLOYEE,
                id: id
            });
            return {
                type: 'employee',
                data: {
                    id: employeeRecord.id,
                    employeName: employeeRecord.getValue({ fieldId: 'entitytitle' }),
                    email: employeeRecord.getValue({ fieldId: 'email' }),
                    phone: employeeRecord.getValue({ fieldId: 'phone' }),
                    hirDate: employeeRecord.getValue({ fieldId: 'hiredate' })
                }
            };
        } catch(e) {
            return { error: e.message };
        }
    }

    return { get: doGet, post: doPost, put: doPut, delete: doDelete };
});