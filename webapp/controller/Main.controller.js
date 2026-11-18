
sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/Token",
    "sap/m/MessageBox",
    "sap/m/PDFViewer"
], function (Controller, Fragment, JSONModel, Filter, FilterOperator, Token, MessageBox , PDFViewer) {
    "use strict";
    return Controller.extend("zficuststat.controller.Main", {
        onInit() {
            this._pdfViewer = new PDFViewer({"isTrustedSource" : true});
            this.getView().addDependent(this._pdfViewer);
            this._oVHConfig = {};
             this._oSource = null;
            var dToday = new Date();
            var dFirstOfMonth = new Date(dToday.getFullYear(), dToday.getMonth(), 1);
            var oFilterModel = new JSONModel({
                CompanyCode: "",
                Division: "",
                Customers: [],
                FromDate: dFirstOfMonth,
                ToDate: dToday,
                MaxDate: dToday
            });
            this.getView().setModel(oFilterModel, "filter");
        },
        _openValueHelp: async function () {
         if (!this._oValueHelpDialog) {

        this._oValueHelpDialog = await Fragment.load({
            id: this.getView().getId(),
            name: "zficuststat.fragment.ValueHelp",
            controller: this
        });
        this.getView().addDependent(this._oValueHelpDialog);
    }
    this._bindValueHelp();
    var oTable = this.byId("tblValueHelp");

oTable.setMode(
    this._oVHConfig.multiSelect ?
    "MultiSelect" :
    "SingleSelectLeft"
);
    this._oValueHelpDialog.setTitle(this._oVHConfig.title);
    this._oValueHelpDialog.open();
},
        onCompanyCodeValueHelp: function (oEvent) {
         this._oSource = oEvent.getSource();
         this._oVHConfig = { entitySet: "/CompanyCodeSet",key: "Bukrs",  description: "Butxt", title: "Select Company Code", multiSelect: false};
    this._openValueHelp();
},
onCustomerValueHelp: function (oEvent) { this._oSource = oEvent.getSource();
     this._oVHConfig = { entitySet: "/CustomerNoSet", key: "Kunnr", description: "Name1", title: "Select Customer",  multiSelect: true};
    this._openValueHelp();
},
onDivisionValueHelp: function (oEvent) {
    this._oSource = oEvent.getSource();
    this._oVHConfig = { entitySet: "/DivisionSet", key: "Spart", description: "Vtext", title: "Select Division", multiSelect: false};
    this._openValueHelp();
},
        _bindValueHelp: function () {
            var oTable = this.byId("tblValueHelp");
            oTable.removeAllItems();
            var oTemplate = new sap.m.ColumnListItem({
                cells: [
                    new sap.m.Text({ text: "{vh>" + this._oVHConfig.key + "}" }),
                    new sap.m.Text({ text: "{vh>" + this._oVHConfig.description + "}" })
                ]
            });
            this.getView().getModel().read(this._oVHConfig.entitySet, {
                success: function (oData) {
                    this._aValueHelpData = oData.results;
                    var oVHModel = new JSONModel({ results: this._aValueHelpData });
                    oTable.setModel(oVHModel, "vh");
                    oTable.bindItems({ path: "vh>/results", template: oTemplate });
                }.bind(this)
            });
        },
        onValueHelpSearch: function (oEvent) {
            var sValue = oEvent.getParameter("newValue");
            var oVH = this.byId("tblValueHelp").getModel("vh");

            if (!sValue) {
                oVH.setProperty("/results", this._aValueHelpData);
                return;
            }
            sValue = sValue.toLowerCase();
            var aFiltered = this._aValueHelpData.filter(function (oItem) {
                return String(oItem[this._oVHConfig.key]).toLowerCase().includes(sValue) ||
                    String(oItem[this._oVHConfig.description]).toLowerCase().includes(sValue);
            }.bind(this));
            oVH.setProperty("/results", aFiltered);
        },
        onValueHelpCancel: function () {
            this._oValueHelpDialog.close();
        },
onValueHelpOk: function () {
    var oTable = this.byId("tblValueHelp");
    var oControl = this._oSource;
    if (this._oVHConfig.multiSelect) {
        var aItems = oTable.getSelectedItems();
        oControl.removeAllTokens();
        aItems.forEach(function (oItem) {
            var oData = oItem.getBindingContext("vh").getObject();
            oControl.addToken(new Token({
                key: oData[this._oVHConfig.key],
                text: oData[this._oVHConfig.description] +
                      " (" + oData[this._oVHConfig.key] + ")"
            }));
        }.bind(this));
    } else {
        var oItem = oTable.getSelectedItem();
        if (!oItem) {
            return;
        }
        var oData = oItem.getBindingContext("vh").getObject();
        oControl.setValue(oData[this._oVHConfig.key]);
        if (oControl.getBinding("value")) {
            oControl.getBinding("value").setValue(oData[this._oVHConfig.key]);
        }
    }
    this._oValueHelpDialog.close();
},
        onDateRangeChange: function (oEvent) {
            var oDRS = oEvent.getSource();
            var bValid = oEvent.getParameter("valid");
            if (bValid && oDRS.getDateValue()) {
                oDRS.setValueState("None");
            } else {
                oDRS.setValueState("Error");
                oDRS.setValueStateText("Enter a valid date");
            }
        },
        onSearch: function () {
            var oView = this.getView();
            var oFilter = oView.getModel("filter").getData();
            var oDRS = this.byId("drsDate");
            var aTokens = this.byId("miCustomer").getTokens();
            var dFrom = oDRS.getDateValue();
            var dTo = oDRS.getSecondDateValue() || dFrom;
            var aErrors = [];
            if (!oFilter.CompanyCode) { aErrors.push("Company Code"); }
            if (!aTokens.length) { aErrors.push("Customer"); }
            if (!oFilter.Division) { aErrors.push("Division"); }
            if (!dFrom || oDRS.getValueState() === "Error") {
                oDRS.setValueState("Error");
                oDRS.setValueStateText("Enter a valid date");
                aErrors.push("Date Range");
            }
            if (aErrors.length) {
                MessageBox.error("Please fill: " + aErrors.join(", "));
                return;
            }
            // var sFrom = this._formatDate(dFrom);   
            // var sTo   = this._formatDate(dTo);     

            var oDateFormat = sap.ui.core.format.DateFormat.getDateInstance({
                pattern: "yyyyMMdd"
            });

            var sFrom = oDateFormat.format(dFrom);
            var sTo = oDateFormat.format(dTo);
            
            var oDateFilter = (sFrom === sTo)
                ? new Filter("Budat", FilterOperator.EQ, sFrom)
                : new Filter({
                    path: "Budat",
                    operator: FilterOperator.BT,
                    value1: sFrom,
                    value2: sTo
                });
            var aFilters = [
                new Filter("Bukrs", FilterOperator.EQ, oFilter.CompanyCode),
                new Filter("Spart", FilterOperator.EQ, oFilter.Division),
                oDateFilter,
                new Filter({
                    filters: aTokens.map(function (oToken) {
                        return new Filter("Kunnr", FilterOperator.EQ, oToken.getKey());
                    }),
                    and: false
                })
            ];
            oView.setBusy(true);

            var okunr = [];
            aTokens.map(function (oToken) {
                okunr.push(oToken.getKey());
            });
            var skunnrstring = okunr.join(",");
            var sstring = "";
            var sname = 'Customer Statement';
            debugger;
            sstring = "Bukrs='" + oFilter.CompanyCode + "',Kunnr='" + skunnrstring + "',Spart='" + oFilter.Division + "',FromDate='" + sFrom + "',ToDate='" + sTo + "'";
            sstring = "/sap/opu/odata/sap/ZFI_CUST_STATEMENT_SRV/FormSet(" + sstring + ")/$value"

            console.log("PDF URL:", sstring);

            this._pdfViewer.setSource(sstring);
            this._pdfViewer.setTitle(sname);
            this._pdfViewer.open();

            // oView.getModel().read("/FormSet", {
            //     filters: aFilters,
            //     success: function (oData) {
            //         oView.setBusy(false);
            //     },
            //     error: function () {
            //         oView.setBusy(false);
            //         MessageBox.error("Failed to load customer statement");
            //     }
            // });
        }
    });
});