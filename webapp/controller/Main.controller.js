sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/Fragment",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/Token",
    "sap/m/MessageBox"
], function (Controller, Fragment, JSONModel, Filter, FilterOperator, Token, MessageBox) {
    "use strict";
    return Controller.extend("zficuststat.controller.Main", {
        onInit() {
            this._sKey = "";
            this._sDescription = "";
            this._sEntitySet = "";
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
        onCustomerValueHelp: async function () {
            this._sEntitySet = "/CustomerNoSet";
            this._sKey = "Kunnr";
            this._sDescription = "Name1";
            if (!this._oValueHelpDialog) {
                this._oValueHelpDialog = await Fragment.load({
                    id: this.getView().getId(),
                    name: "zficuststat.fragment.ValueHelp",
                    controller: this
                });
                this.getView().addDependent(this._oValueHelpDialog);
            }
            this._bindValueHelp();
            this._oValueHelpDialog.setTitle("Select Customer");
            this._oValueHelpDialog.open();
        },
        _bindValueHelp: function () {
            var oTable = this.byId("tblValueHelp");
            oTable.removeAllItems();
            var oTemplate = new sap.m.ColumnListItem({
                cells: [
                    new sap.m.Text({ text: "{vh>" + this._sKey + "}" }),
                    new sap.m.Text({ text: "{vh>" + this._sDescription + "}" })
                ]
            });
            this.getView().getModel().read(this._sEntitySet, {
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
                return String(oItem[this._sKey]).toLowerCase().includes(sValue) ||
                    String(oItem[this._sDescription]).toLowerCase().includes(sValue);
            }.bind(this));
            oVH.setProperty("/results", aFiltered);
        },
        onValueHelpCancel: function () {
            this._oValueHelpDialog.close();
        },
        onValueHelpOk: function () {
            var aItems = this.byId("tblValueHelp").getSelectedItems();
            var oMultiInput = this.byId("miCustomer");
            oMultiInput.removeAllTokens();

            aItems.forEach(function (oItem) {
                var oData = oItem.getBindingContext("vh").getObject();
                oMultiInput.addToken(new Token({
                    key: oData[this._sKey],
                    text: oData[this._sDescription] + " (" + oData[this._sKey] + ")"
                }));
            }.bind(this));

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
            debugger;
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
            oView.getModel().read("/FormSet", {
                filters: aFilters,
                success: function (oData) {
                    oView.setBusy(false);
                },
                error: function () {
                    oView.setBusy(false);
                    MessageBox.error("Failed to load customer statement");
                }
            });
        }
    });
});