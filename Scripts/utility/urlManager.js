define(['jquery'], function ($) {
    function getUrlParam(paramName) { //получение значения параметра
        var results = new RegExp('[\?&]' + paramName.toLowerCase() + '=([^&#]*)').exec(window.location.href.toLowerCase());
        if (results == null)
            return null;
        else
            return results[1] || 0;
    };
    function removeURLParam(url, paramName) {//формирует новый запрос, исключая параметр
        var urlparts = url.split('?');
        if (urlparts.length >= 2) {
            var prefix = encodeURIComponent(paramName.toLowerCase()) + '=';
            var pars = urlparts[1].split(/[&;]/g);
            for (var i = pars.length; i-- > 0;)
                if (pars[i].toLowerCase().indexOf(prefix, 0) == 0)
                    pars.splice(i, 1);
            if (pars.length > 0)
                return urlparts[0] + '?' + pars.join('&');
            else
                return urlparts[0];
        }
        else
            return url;
    };
    function getQueryParams() {//функция получения всего списка параметров url в виде объекта с полями
        var retval = {};
        if (window.location.search.length <= 1)
            return retval;
        //
        var query = window.location.search.substring(1);//?
        var vars = query.split("&");
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split("=");
            var name = pair[0];
            var val = decodeURIComponent(pair[1]);
            //
            retval[name] = val;
        }
        return retval;
    };
    function toQueryString(params) {//формирует строку поиска
        var retval = '';
        for (var key in params) {
            if (params.hasOwnProperty(key) && params[key] != undefined)
                retval += (retval.length > 0 ? '&' : '') + key + '=' + encodeURIComponent(params[key]);
        }
        if (retval.length > 0)
            retval = '?' + retval;
        //
        return retval;
    };
    function processParameter(paramName, parameterIgnorePrefix, historyText, getObjectIDUrl, getObjectIDParameterName, callback) {
        var urlValue = getUrlParam(paramName);
        if (urlValue) {
            if (parameterIgnorePrefix)
                urlValue = urlValue.replace(parameterIgnorePrefix.toLowerCase(), '');
            //
            var newUri = removeURLParam(window.location.href, paramName);
            window.history.replaceState(null, historyText + urlValue, newUri);
            //
            if (getObjectIDUrl && getObjectIDParameterName) {
                require(['sdForms', 'ajax'], function (fhModule, ajaxLib) {
                    var ajaxControl = new ajaxLib.control();
                    var param = {};
                    param[getObjectIDParameterName] = urlValue;
                    ajaxControl.Ajax($('body'),
                        {
                            url: getObjectIDUrl + '?' + $.param(param),
                            method: 'GET'
                        },
                        function (result) {
                            if (result) {
                                var fh = new fhModule.formHelper();
                                callback(result, fh);
                            }
                        });
                });
            }
            else
                require(['sdForms'], function (fhModule) {
                    var fh = new fhModule.formHelper();
                    callback(urlValue, fh);
                });
        }
        return urlValue ? true : false;
    };
    function processGradeParameter() {
        var token = getUrlParam('token');
        var grade = getUrlParam('grade');
        if (token && grade) {
            var newUri = removeURLParam(window.location.href, 'token');
            newUri = removeURLParam(newUri, 'grade');
            //
            window.history.replaceState(null, 'set call grade ' + token, newUri);
            //
            token = token.toLowerCase();
            var callIDD = $.Deferred();
            //
            if (token.indexOf('im-cl-') == 0 || parseInt(token).toString() == token) {//it's a full number or number
                setUserView('ClientCallForTable');
                require(['ajax'], function (ajaxLib) {
                    var ajaxControl = new ajaxLib.control();
                    var param = {};
                    param['number'] = token.replace('im-cl-', '');
                    ajaxControl.Ajax($('body'),
                        {
                            url: 'sdApi/GetCallID?' + $.param(param),
                            method: 'GET'
                        },
                        function (callID) {
                            if (callID)
                                callIDD.resolve(callID);
                        });
                });
            }
            else if (token.indexOf('-') != -1 && token.length == 36)//it's guid
            {
                setUserView('ClientCallForTable');
                callIDD.resolve(token);
            }
            //            
            $.when(callIDD).done(function (callID) {
                require(['sdForms'], function (fhModule) {
                    var fh = new fhModule.formHelper(); 
                    fh.ShowCall(callID, fh.Mode.ClientMode | fh.Mode.SetGrade, { newGrade: grade });
                });
            });
        }
        return token ? true : false;
    };
    //current view of list
    function setUserView(newValue) {
        $.when(userD).done(function (user) {
            if (user.ViewNameSD == newValue)
                return;
            if (user.SDViewNameSubscribe)
                user.SDViewNameSubscribe(newValue);
            else {
                showSpinner($('#regionListMode')[0]);
                // 
                require(['ajax'], function (ajaxLib) {
                    var ajaxControl = new ajaxLib.control();
                    ajaxControl.Ajax(null,
                        {
                            url: 'accountApi/SetViewName',
                            method: 'POST',
                            data: { ViewName: newValue, Module: 0 } //InfraManager.Web.BLL.Modules.SD
                        },
                        function (isSuccess) {
                            hideSpinner($('#regionListMode')[0]);
                            //
                            if (isSuccess === 0) {
                                user.ViewNameSD = newValue;
                            }
                            else {
                                if (isSuccess === 1)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('SaveError'), getTextResource('NullParamsError'), 'error');
                                    });
                                else if (isSuccess === 2)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('SaveError'), getTextResource('BadParamsError'), 'error');
                                    });
                                else if (isSuccess === 3)
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('SaveError'), getTextResource('AccessError'), 'error');
                                    });
                                else
                                    require(['sweetAlert'], function () {
                                        swal(getTextResource('SaveError'), getTextResource('AjaxError') + '\n[ListMode.js, viewName.subscribe]', 'error');
                                    });
                            }
                        });
                })
            }
            //           
        });
    };
    //
    function operationIsGranted(operationID, grantedOperations) {
        for (var i = 0; i < grantedOperations.length; i++)
            if (grantedOperations[i] === operationID)
            return true;
    return false;
    };
    function processUrl() {
        processGradeParameter();
        //
        //ВЕЗДЕ ЖДЕМ ФОРМ ХЕЛПЕР С ФОРМАМИ СД, ЕСЛИ ПОЯВЯТСЯ НЕ ТАКИЕ - ПЕРЕПИСЫВАЕМ ЛОГИКУ ФУНКЦИИ
        //
        var callOpen = function (id, fh) {
            $.when(userD).done(function (user) {
                if (!user.HasRoles)
                    setUserView('ClientCallForTable');
                else if (user.HasRoles && operationIsGranted(647, user.GrantedOperations))             
                    setUserView('CallForTable');
                else
                    setUserView('CommonForTable');
            })
            var params = undefined;
            //
            var mode = getUrlParam('mode');
            var useView = getUrlParam('useView');
            if (mode || useView)
                params = {};
            if (mode) {
                var newUri = removeURLParam(window.location.href, 'mode');
                window.history.replaceState(null, 'open call, mode: ' + mode, newUri);
                params['mode'] = mode;
            }
            if (useView) {
                var newUri = removeURLParam(window.location.href, 'useView');
                window.history.replaceState(null, 'open call, useView: ' + useView, newUri);
                params['useView'] = useView;
            }
            fh.ShowCallByContext(id, params);
        };
        processParameter('callNumber', 'IM-CL-', 'view call №', 'sdApi/GetCallID', 'number', callOpen);
        processParameter('callID', '', 'view call ', '', '', callOpen);
        //
        var workOrderOpen = function (id, fh) {
            $.when(userD).done(function (user) {
            if (!user.HasRoles)
                setUserView('ClientCallForTable');
            else if (user.HasRoles && operationIsGranted(649, user.GrantedOperations))
                setUserView('WorkOrderForTable');
            else
                setUserView('CommonForTable');
            })
            fh.ShowWorkOrder(id, fh.Mode.Default);
        };
        processParameter('workOrderNumber', 'IM-TS-', 'view workOrder №', 'sdApi/GetWorkOrderID', 'number', workOrderOpen);
        processParameter('workOrderID', '', 'view workOrder ', '', '', workOrderOpen);
        //
        var problemOpen = function (id, fh) {
            $.when(userD).done(function (user) {
                 if (!user.HasRoles)
                    setUserView('ClientCallForTable');
                else if (user.HasRoles && operationIsGranted(648, user.GrantedOperations))
                    setUserView('ProblemForTable');
                else
                    setUserView('CommonForTable');
            })
            fh.ShowProblem(id, fh.Mode.Default);
        };
        processParameter('problemNumber', 'IM-PL-', 'view problem №', 'sdApi/GetProblemID', 'number', problemOpen);
        processParameter('problemID', '', 'view problem ', '', '', problemOpen);
        //
        var rfcOpen = function (id, fh) {
            $.when(userD).done(function (user) {
                if (!user.HasRoles)
                    setUserView('ClientCallForTable');
                else if (user.HasRoles && operationIsGranted(707, user.GrantedOperations))
                    setUserView('RFCForTable');
                else
                    setUserView('CommonForTable');
            })
            fh.ShowRFC(id, fh.Mode.Default);
        };
        processParameter('rfcNumber', 'IM-RL-', 'view RFC №', 'sdApi/GetRFCID', 'number', rfcOpen);
        processParameter('RFCID', '', 'view RFC ', '', '', rfcOpen);
        //
        var kbArticleOpen = function (id, fh) {
            fh.ShowObjectForm(137, id);
        };
        processParameter('kbArticleNumber', '', 'view KB №', 'sdApi/GetKBArticleID', 'number', kbArticleOpen);
        processParameter('kbArticleID', '', 'view KB ', '', '', kbArticleOpen);
        ///
        var negotiationOpen = function (negotiationInfo, fh) {
            setUserView('NegotiationForTable');
            var params = { NegotiationID: negotiationInfo.ID };
            fh.ShowObjectForm(negotiationInfo.ObjectClassID, negotiationInfo.ObjectID, 8, params);//Mode.TabNegotiation = 8
        };
        processParameter('negotiationID', '', 'view negotiation ', 'sdApi/GetNegotiationInfo', 'negotiationID', negotiationOpen);
        //
        var controlOpen = function (info, fh) {
            setUserView('CustomControlForTable');
            fh.ShowObjectForm(info.ClassID, info.ID);
        };
        processParameter('controlID', '', 'view control ', 'sdApi/GetControlSDObjectInfo', 'controlID', controlOpen);
        //
        var goodsInvoiceOpen = function (goodsInvoiceID, fh) {
            require(['financeForms'], function (financeModule) {
                var fh = new financeModule.formHelper();
                fh.ShowGoodsInvoiceByID(goodsInvoiceID);
            });
        };
        processParameter('goodsInvoiceID', '', 'view goods invoice ', null, null, goodsInvoiceOpen);
        //
        var agreementShow = function (contractAgreementID, serviceContractID) {
            require(['assetForms'], function (assetModule) {
                var fh = new assetModule.formHelper();
                fh.ShowServiceContractAgreement(contractAgreementID, serviceContractID);
            });
        };
        var agreementCreate = function (serviceContractID) {
            agreementShow(null, serviceContractID);
        };
        var agreementOpen = function (contractAgreementID) {
            agreementShow(contractAgreementID);
        };
        //
        processParameter('agreement_serviceContractID', '', 'view contract agreement ', null, null, agreementCreate);
        processParameter('contractAgreementID', '', 'view contract agreement ', null, null, agreementOpen);
        //
        var contractOpen = function (contractID, fh) {
            require(['assetForms'], function (assetModule) {
                var fh = new assetModule.formHelper();
                fh.ShowServiceContract(contractID);
            });
        };
        processParameter('serviceContractID', '', 'view contract ', null, null, contractOpen);
        //
        var licenceOpen = function (licenceID, fh) {
            require(['assetForms'], function (assetModule) {
                var fh = new assetModule.formHelper();
                fh.ShowSoftwareLicenceForm(licenceID);
            });
        };
        processParameter('softwareLicenceID', '', 'view licence ', null, null, licenceOpen);
        //
        var logicObjectShow = function (logicObjectID, fh) {
            require(['assetForms'], function (assetModule) {
                var fh = new assetModule.formHelper();
                fh.ShowLogicalObjectForm(logicObjectID);
            });
        };
        //
        processParameter('logicObjectID', '', 'view logic object', null, null, logicObjectShow);
        //
        var DataEntityShow = function (dataEntityID, fh) {
            require(['assetForms'], function (assetModule) {
                var fh = new assetModule.formHelper();
                fh.ShowDataEntityObjectForm(dataEntityID);
            });
        };
        //
        processParameter('dataEntityID', '', 'view data entity object', null, null, DataEntityShow);
        //
        //IMSystem.Global.OBJ_NETWORKDEVICE
        var AssetFormShow = function (networkDeviceID, fh) {
            require(['assetForms'], function (assetModule) {
                var fh = new assetModule.formHelper();
                fh.ShowAssetForm(networkDeviceID, 5);
            });
        };
        //
        processParameter('networkDeviceID', '', 'view network device object', null, null, AssetFormShow);
        //
        //IMSystem.Global.OBJ_TERMINALDEVICE
        var AssetFormShow = function (terminalDeviceID, fh) {
            require(['assetForms'], function (assetModule) {
                var fh = new assetModule.formHelper();
                fh.ShowAssetForm(terminalDeviceID, 6);
            });
        };
        //
        processParameter('terminalDeviceID', '', 'view terminal device object', null, null, AssetFormShow);
        //
        //IMSystem.Global.OBJ_ADAPTER
        var AssetFormShow = function (adapterID, fh) {
            require(['assetForms'], function (assetModule) {
                var fh = new assetModule.formHelper();
                fh.ShowAssetForm(adapterID, 33);
            });
        };
        //
        processParameter('adapterID', '', 'view adapter object', null, null, AssetFormShow);
        //
        //IMSystem.Global.OBJ_PERIPHERAL
        var AssetFormShow = function (peripheralID, fh) {
            require(['assetForms'], function (assetModule) {
                var fh = new assetModule.formHelper();
                fh.ShowAssetForm(peripheralID, 34);
            });
        };
        //
        processParameter('peripheralID', '', 'view peripheral object', null, null, AssetFormShow);
        //
        //IMSystem.Global.OBJ_ConfigurationUnit
        var cuFormShow = function (configurationUnitID, fh) {
            require(['assetForms'], function (assetModule) {
                var fh = new assetModule.formHelper();
                fh.ShowConfigurationUnitForm(configurationUnitID);
            });
        };
        //
        processParameter('configurationUnitID', '', 'view configuration unit object', null, null, cuFormShow);
    };
    //
    return {
        getUrlParam: getUrlParam,
        removeURLParam: removeURLParam,
        getQueryParams: getQueryParams,
        toQueryString: toQueryString,

        processUrl: processUrl
    };
});