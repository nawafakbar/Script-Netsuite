/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/search', 'N/record'], function(search, record) {

    // GET Handler - untuk ambil data
    function doGet(requestParams) {
        var type = requestParams.type;

        if (type === 'employee') {
            return getEmployees();
        } else if (type === 'department') {
            return getDepartments();
        } else if (type === 'customer') {
            return getCustomers();
        } else if (type === 'project') {
            return getProjects();
        } else {
            return { error: 'type parameter tidak dikenali. Gunakan: employee, department, customer, project' };
        }
    }

    // Get Employees
    function getEmployees() {
        var results = [];
        try {
            var employeeSearch = search.create({
                type: search.Type.EMPLOYEE,
                filters: [
                    ['isinactive', 'is', 'F']
                ],
                columns: [
                    search.createColumn({ name: 'internalid' }),
                    search.createColumn({ name: 'firstname' }),
                    search.createColumn({ name: 'lastname' }),
                    search.createColumn({ name: 'email' }),
                    search.createColumn({ name: 'title' })
                ]
            });

            employeeSearch.run().each(function(result) {
                results.push({
                    id: result.getValue({ name: 'internalid' }),
                    firstName: result.getValue({ name: 'firstname' }),
                    lastName: result.getValue({ name: 'lastname' }),
                    email: result.getValue({ name: 'email' }),
                    title: result.getValue({ name: 'title' })
                });
                return true;
            });
        } catch(e) {
            return { error: e.message };
        }
        return { type: 'employee', count: results.length, data: results };
    }

    // Get Departments
    function getDepartments() {
        var results = [];
        search.create({
            type: search.Type.DEPARTMENT,
            columns: ['internalid', 'name']
        }).run().each(function(result) {
            results.push({
                id: result.getValue('internalid'),
                name: result.getValue('name')
            });
            return true;
        });
        return { type: 'department', count: results.length, data: results };
    }

    // Get Customers
    function getCustomers() {
        var results = [];
        search.create({
            type: search.Type.CUSTOMER,
            columns: ['internalid', 'companyname', 'email', 'phone']
        }).run().each(function(result) {
            results.push({
                id: result.getValue('internalid'),
                companyName: result.getValue('companyname'),
                email: result.getValue('email'),
                phone: result.getValue('phone')
            });
            return true;
        });
        return { type: 'customer', count: results.length, data: results };
    }

    // Get Projects
    function getProjects() {
        var results = [];
        search.create({
            type: search.Type.JOB,
            columns: ['internalid', 'companyname', 'customer', 'status']
        }).run().each(function(result) {
            results.push({
                id: result.getValue('internalid'),
                projectName: result.getValue('companyname'),
                customer: result.getText('customer'),
                status: result.getText('status')
            });
            return true;
        });
        return { type: 'project', count: results.length, data: results };
    }

    return { get: doGet };
});