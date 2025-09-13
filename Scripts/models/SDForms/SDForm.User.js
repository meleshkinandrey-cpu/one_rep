define(['knockout', 'jquery', 'ajax', 'ttControl'], function (ko, $, ajaxLib, tclib) {
    var module = {
        UserTypes: {
            initiator: 'Initiator',
            client: 'Client',
            owner: 'Owner',
            executor: 'Executor',
            accomplisher: 'Accomplisher',
            assignor: 'Assignor',
            workOrderInitiator: 'WorkOrderInitiator',
            queueExecutor: 'QueueExecutor',
            director: 'Director',
            projectInitiator: 'ProjectInitiator',
            workInitiator: 'WorkInitiator',
            workExecutor: 'WorkExecutor',
            withoutType: 'WithoutType',
            utilizer: 'Utilizer',
            writerOff: 'WriterOff',
            mResponsible: 'MaterialResponsible',
            organization: 'Organization',
            subdivision: 'Subdivision',
            contractUser: 'contractUser',
            contactPerson: 'ContactPerson',
            inspector: 'Inspector'
        },
        User: function (parentSelf, options) {//используется для представления пользователь и представления группа  userID, userType, userName, UserData for no load data
            var uself = this;
            var self = parentSelf;
            uself.Options = options;
            //
            self.$isLoaded = $.Deferred();
            //
            uself.ShowTypeName = ko.observable(options.ShowTypeName === false ? false : true);
            uself.ForceTypeName = ko.observable(options.ForceTypeName ? options.ForceTypeName : null);
            uself.ShowRightSideButtons = ko.observable(options.ShowRightSideButtons ? options.ShowRightSideButtons : false);
            //
            uself.ID = ko.observable(options.UserID);

            var classID;
            if (options.UserType == module.UserTypes.queueExecutor) {
                classID = 722;//IMSystem.Global.OBJ_QUEUE
            }
            else if (options.UserType == module.UserTypes.organization) {
                classID = 101;//IMSystem.Global.OBJ_ORGANIZATION
            }
            else if (options.UserType == module.UserTypes.subdivision) {
                classID = 102;//IMSystem.Global.OBJ_DIVISION
            }
            else if (options.UserType == module.UserTypes.contactPerson) {
                classID = 384;//IMSystem.Global.OBJ_SupplierContactPerson
            }
            else
                classID = 9;//IMSystem.Global.OBJ_USER
            //
            uself.ClassID = ko.observable(classID);
            uself.Type = ko.observable(options.UserType);
            uself.Name = ko.observable(options.UserName);
            if (uself.Name() == null)
                uself.Name('');
            //
            uself.Family = ko.observable('');
            uself.Patronymic = ko.observable('');
            uself.Email = ko.observable('');
            //
            uself.QueueUserIDList = ko.observableArray([]);   
            uself.QueueUserFullNameList = ko.observableArray([]);   
            //
            uself.Phone = ko.observable('');
            uself.PhoneInternal = ko.observable('');
            uself.CanCallToUser = ko.observable(false);
            uself.PhoneString = ko.computed(function () {
                var retval = uself.Phone();
                if (retval.length > 0) {
                    if (uself.PhoneInternal())
                        if (uself.ClassID() == 9)//IMSystem.Global.OBJ_USER
                            retval += ', ' + getTextResource('Telephony_ExtensionNumberShort') + ' ' + uself.PhoneInternal();
                        else
                            retval += ', ' + uself.PhoneInternal();
                }
                else
                    retval = uself.PhoneInternal();
                //
                return retval;
            });
            //
            uself.Fax = ko.observable('');
            uself.Other = ko.observable('');
            uself.PositionName = ko.observable('');
            uself.SubdivisionFullName = ko.observable('');
            uself.SubdivisionName = ko.observable('');
            uself.OrganizationName = ko.observable('');
            uself.SubdivisionID = ko.observable('');
            uself.OrganizationID = ko.observable('');
            uself.Number = ko.observable('');
            uself.Note = ko.observable('');
            uself.BuildingName = ko.observable('');
            uself.RoomName = ko.observable('');
            uself.FloorName = ko.observable('');
            uself.WorkplaceName = ko.observable('');
            //only queue fields
            uself.ResponsibleID = ko.observable('');
            uself.ResponsibleFullName = ko.observable('');
            uself.QueueType = ko.observable('');
            uself.QueueTypeName = ko.observable('');
            //
            uself.InitializeUser = function (userData) {
                if (userData) {
                    uself.Name(userData.Name);
                    uself.Family(userData.Family);
                    uself.Patronymic(userData.Patronymic);
                    uself.Email(userData.Email);
                    uself.Phone(userData.Phone);
                    uself.PhoneInternal(userData.PhoneInternal);
                    uself.CanCallToUser(userData.CanCallToUser);
                    uself.Fax(userData.Fax);
                    uself.Other(userData.Other);
                    uself.PositionName(userData.PositionName);
                    uself.SubdivisionFullName(userData.SubdivisionFullName);
                    uself.SubdivisionName(userData.SubdivisionName);
                    uself.OrganizationName(userData.OrganizationName);
                    uself.SubdivisionID(userData.SubdivisionID);
                    uself.OrganizationID(userData.OrganizationID);
                    uself.Number = ko.observable(userData.Number);
                    uself.Note = ko.observable(userData.Note);
                    uself.BuildingName = ko.observable(userData.BuildingName);
                    uself.RoomName(userData.RoomName);
                    uself.FloorName = ko.observable(userData.FloorName);
                    uself.WorkplaceName = ko.observable(userData.WorkplaceName);
                    //
                    self.$isLoaded.resolve();
                }
            };
            //
            uself.InitializeQueue = function (queueData) {
                if (queueData) {
                    uself.Name(queueData.Name);
                    uself.Note(queueData.Note);
                    uself.ResponsibleID(queueData.ResponsibleID);
                    uself.ResponsibleFullName(queueData.ResponsibleFullName);
                    uself.QueueType(queueData.QueueType);
                    uself.QueueTypeName(queueData.QueueTypeName); 
                    //
                    uself.QueueUserIDList(queueData.QueueUserID);
                    uself.QueueUserFullNameList(queueData.QueueUserList);
                    if (self.CheckExecutor)
                        self.CheckExecutor();
                    if (self.CheckOwner)
                        self.CheckOwner();
                    //
                    self.$isLoaded.resolve();
                }
            };
            //
            uself.InitializeSubdivision = function (subdivisionData) {
                if (subdivisionData) {
                    uself.Name(subdivisionData);
                    //
                    self.$isLoaded.resolve();
                }
            };
            //
            uself.InitializeOrganization = function (organizationData) {
                if (organizationData) {
                    uself.Name(organizationData);
                    //
                    self.$isLoaded.resolve();
                }
            };
            //
            uself.MergeUser = function (userData) {
                if (userData) {
                    uself.Name(userData.Name);
                    uself.Family(userData.Family);
                    uself.Patronymic(userData.Patronymic);
                    uself.Email(userData.Email);
                    uself.Phone(userData.Phone);
                    uself.PhoneInternal(userData.PhoneInternal);
                    uself.CanCallToUser(userData.CanCallToUser);
                    uself.Fax(userData.Fax);
                    uself.Other(userData.Other);
                    uself.PositionName(userData.PositionName);
                    uself.SubdivisionFullName(userData.SubdivisionFullName);
                    uself.SubdivisionName(userData.SubdivisionName);
                    uself.OrganizationName(userData.OrganizationName);
                    uself.SubdivisionID(userData.SubdivisionID);
                    uself.OrganizationID(userData.OrganizationID);
                    uself.Number(userData.Number);
                    uself.Note(userData.Note);
                    uself.BuildingName(userData.BuildingName);
                    uself.RoomName(userData.RoomName);
                    uself.FloorName(userData.FloorName);
                    uself.WorkplaceName(userData.WorkplaceName);
                    //
                    self.$isLoaded.resolve();
                }
            };
            //
            uself.Load = function () {
                if (uself.Type() == module.UserTypes.organization) {
                    var ajaxControl = new ajaxLib.control();
                    var param = { organizationID: uself.ID() };
                    //
                    ajaxControl.Ajax(self.$region ? null : self.$region,
                        {
                            dataType: "json",
                            method: 'GET',
                            url: 'userApi/GetOrganizationInfo?' + $.param(param)
                        },
                        function (userData) { uself.InitializeOrganization(userData); }
                    );
                }
                else if (uself.Type() == module.UserTypes.subdivision) {
                    var ajaxControl = new ajaxLib.control();
                    var param = { subdivistionID: uself.ID() };
                    //
                    ajaxControl.Ajax(self.$region ? null : self.$region,
                        {
                            dataType: "json",
                            method: 'GET',
                            url: 'userApi/GetSubdivistionInfo?' + $.param(param)
                        },
                        function (userData) { uself.InitializeSubdivision(userData); }
                    );
                }
                else if (uself.Type() == module.UserTypes.queueExecutor) {
                    if (uself.Options.QueueData) {
                        uself.InitializeQueue(uself.Options.QueueData);
                        return;
                    }
                    //
                    var ajaxControl = new ajaxLib.control();
                    var param = { queueID: uself.ID() };
                    //
                    ajaxControl.Ajax(self.$region ? null : self.$region,
                        {
                            dataType: "json",
                            method: 'GET',
                            url: 'userApi/GetQueueInfo?' + $.param(param)
                        },
                        function (queueData) { uself.InitializeQueue(queueData); }
                    );
                }
                else if (uself.Type() == module.UserTypes.contactPerson) {
                    //
                    if (uself.Options.UserData) {
                        uself.InitializeUser(uself.Options.UserData);
                        return;
                    }
                    //
                    var ajaxControl = new ajaxLib.control();
                    var param = { userID: uself.ID() };
                    //
                    ajaxControl.Ajax(self.$region ? null : self.$region,
                        {
                            dataType: "json",
                            method: 'GET',
                            url: 'userApi/GetContactPersonInfo?' + $.param(param)
                        },
                        function (userData) { uself.InitializeUser(userData); }
                    );
                }
                else {
                    //
                    if (uself.Options.UserData) {
                        uself.InitializeUser(uself.Options.UserData);
                        return;
                    }
                    //
                    var ajaxControl = new ajaxLib.control();
                    var param = { userID: uself.ID() };
                    //
                    ajaxControl.Ajax(self.$region ? null : self.$region,
                        {
                            dataType: "json",
                            method: 'GET',
                            url: 'userApi/GetUserInfo?' + $.param(param)
                        },
                        function (userData) { uself.InitializeUser(userData); }
                    );
                }
            };
            //
            uself.FullName = ko.computed(function () {
                if (uself.Type() == module.UserTypes.queueExecutor)
                    return uself.Name();
                else
                    return (uself.Family() + ' ' + uself.Name() + ' ' + uself.Patronymic()).trim();
            });
            //
            uself.TypeName = ko.computed(function () {
                var type = uself.Type();
                //
                if (uself.ForceTypeName())
                    return uself.ForceTypeName();
                //
                if (type == module.UserTypes.accomplisher)
                    return getTextResource('Accomplisher');
                else if (type == module.UserTypes.assignor)
                    return getTextResource('Assignor');
                else if (type == module.UserTypes.client)
                    return getTextResource('Client');
                else if (type == module.UserTypes.executor)
                    return getTextResource('Executor');
                else if (type == module.UserTypes.initiator)
                    return getTextResource('Initiator');
                else if (type == module.UserTypes.owner)
                    return getTextResource('Owner');
                else if (type == module.UserTypes.workOrderInitiator)
                    return getTextResource('WorkOrderInitiator');
                else if (type == module.UserTypes.queueExecutor)
                    return getTextResource('Queue');
                else if (type == module.UserTypes.director)
                    return getTextResource('Director');
                else if (type == module.UserTypes.projectInitiator)
                    return getTextResource('ProjectInitiator');
                else if (type == module.UserTypes.workInitiator)
                    return getTextResource('ManhourWorkInitiator');
                else if (type == module.UserTypes.workExecutor)
                    return getTextResource('ManhourWorkExecutor');
                else if (type == module.UserTypes.utilizer)
                    return getTextResource('AssetNumber_UtilizerName');
                else if (type == module.UserTypes.writerOff)
                    return getTextResource('WrittenOff_UserNameOff');
                else if (type == module.UserTypes.mResponsible)
                    return getTextResource('Maintenance_UserName');
                else if (type == module.UserTypes.organization)
                    return getTextResource('UserOrganization');
                else if (type == module.UserTypes.subdivision)
                    return getTextResource('UserSubdivision');
                else if (type == module.UserTypes.kbaAuthor)
                    return getTextResource('Posted');
                else if (type == module.UserTypes.inspector)
                    return getTextResource('Inspector');
                else if (type == module.UserTypes.withoutType)
                    return '';
                else return '';
            });
            //
            uself.CanEdit = ko.computed(function () {
                var type = uself.Type();
                //
                if (type == module.UserTypes.accomplisher)
                    return parentSelf.CanEdit() && options.EditAction;
                else if (type == module.UserTypes.assignor)
                    return parentSelf.CanEdit() && options.EditAction;
                else if (type == module.UserTypes.client)
                    return parentSelf.CanEdit() && options.EditAction;
                else if (type == module.UserTypes.executor)
                    return parentSelf.CanEdit() && options.EditAction;
                else if (type == module.UserTypes.initiator)
                    return parentSelf.CanEdit() && options.EditAction;
                else if (type == module.UserTypes.owner)
                    return parentSelf.CanEdit() && options.EditAction;
                else if (type == module.UserTypes.workOrderInitiator)
                    return parentSelf.CanEdit() && options.EditAction;
                else if (type == module.UserTypes.workInitiator)
                    return parentSelf.CanEdit() && options.EditAction;
                else if (type == module.UserTypes.workExecutor)
                    return parentSelf.CanEdit() && options.EditAction;
                else if (type == module.UserTypes.queueExecutor)
                    return parentSelf.CanEdit() && options.EditAction;
                else if (type == module.UserTypes.director)
                    return parentSelf.CanEdit() && options.EditAction;
                else if (type == module.UserTypes.projectInitiator)
                    return parentSelf.CanEdit() && options.EditAction;
                else if (type == module.UserTypes.utilizer)
                    return parentSelf.CanEdit() && options.EditAction;
                else if (type == module.UserTypes.writerOff)
                    return parentSelf.CanEdit() && options.EditAction;
                else if (type == module.UserTypes.mResponsible)
                    return parentSelf.CanEdit() && options.EditAction;
                else if (type == module.UserTypes.organization)
                    return parentSelf.CanEdit() && options.EditAction;
                else if (type == module.UserTypes.subdivision)
                    return parentSelf.CanEdit() && options.EditAction;
                else if (type == module.UserTypes.contractUser)
                    return parentSelf.CanEdit() && options.EditAction;
                else if (type == module.UserTypes.contactPerson)
                    return parentSelf.CanEdit() && options.EditAction;
                else if (type == module.UserTypes.kbaAuthor)
                    return parentSelf.CanEdit() && options.EditAction;
                else if (type == module.UserTypes.withoutType)
                    return false;
                else return false;
            });
            //
            uself.CanRemove = ko.computed(function () {
                var type = uself.Type();
                //
                /*if (type == module.UserTypes.accomplisher)
                    return parentSelf.CanEdit() && options.RemoveAction;
                else if (type == module.UserTypes.assignor)
                    return parentSelf.CanEdit() && options.RemoveAction;
                else if (type == module.UserTypes.client)
                    return parentSelf.CanEdit() && options.RemoveAction;
                else if (type == module.UserTypes.executor)
                    return parentSelf.CanEdit() && options.RemoveAction;
                else if (type == module.UserTypes.initiator)
                    return parentSelf.CanEdit() && options.RemoveAction;
                else if (type == module.UserTypes.owner)
                    return parentSelf.CanEdit() && options.RemoveAction;
                else if (type == module.UserTypes.workOrderInitiator)
                    return parentSelf.CanEdit() && options.RemoveAction;
                else if (type == module.UserTypes.queueExecutor)
                    return parentSelf.CanEdit() && options.RemoveAction;
                else if (type == module.UserTypes.workInitiator)
                    return parentSelf.CanEdit() && options.RemoveAction;
                else if (type == module.UserTypes.workExecutor)
                    return parentSelf.CanEdit() && options.RemoveAction;
                else if (type == module.UserTypes.director)
                    return parentSelf.CanEdit() && options.RemoveAction;
                else if (type == module.UserTypes.projectInitiator)
                    return parentSelf.CanEdit() && options.RemoveAction;
                else if (type == module.UserTypes.withoutType)
                    return parentSelf.CanEdit() && options.RemoveAction;
                else return false;*/
                if (type == module.UserTypes.contractUser)
                    return parentSelf.CanEdit() && options.RemoveAction;
                if (type == module.UserTypes.contactPerson)
                    return parentSelf.CanEdit() && options.RemoveAction;
                else
                    return false;
            });
            //Заполнение формы поиска пользователя
            {
            uself.GetSelectClientInfo = function () {
                var retval = '';
                retval += getTextResource('UserPosition') + ': ' + uself.PositionName() + '<br/>';
                retval += getTextResource('UserSubdivision') + ': ' + uself.SubdivisionName() + '<br/>';
                retval += getTextResource('UserOrganization') + ': ' + uself.OrganizationName() + '<br/>' + '<br/>';
                retval += getTextResource('UserRoom') + ': ' + uself.RoomName() + '<br/>';
                retval += getTextResource('UserPhone') + ': ' + uself.Phone() + '<br/>';
                retval += getTextResource('UserFax') + ': ' + uself.Fax() + '<br/>';
                retval += getTextResource('SecondPhone') + ': ' + uself.PhoneInternal();
                return retval;
                }
            uself.FullUserPostitionInfo = ko.computed(function () {
                var retval = '';
                retval += getTextResource('UserPosition') + ': ' + uself.PositionName();
                return retval;
                });
            uself.FullUserSubdivisionInfo = ko.computed(function () {
                var retval = '';
                retval += getTextResource('UserSubdivision') + ': ' + uself.SubdivisionName();
                return retval;
            });
            uself.FullUserOrganizationInfo = ko.computed(function () {
                var retval = '';
                retval += getTextResource('UserOrganization') + ': ' + uself.OrganizationName();
                return retval;
            });
            uself.FullUserRoomInfo = ko.computed(function () {
                var retval = '';
                retval += getTextResource('UserRoom') + ': ' + uself.RoomName();
                return retval;
            });
            uself.FullUserPhoneInfo = ko.computed(function () {
                var retval = '';
                retval += getTextResource('UserPhone') + ': ' + uself.Phone();
                return retval;
            });
                uself.FullUserEmailInfo = ko.computed(function () {
                    var retval = '';
                    retval += getTextResource('UserEmail') + ': ' + uself.Email();
                    return retval;
                });
            uself.FullUserFaxInfo = ko.computed(function () {
                var retval = '';
                retval += getTextResource('UserFax') + ': ' + uself.Fax();
                return retval;
            });
            uself.FullSecondPhoneInfo = ko.computed(function () {
                var retval = '';
                retval += getTextResource('InternalPhone') + ': ' + uself.PhoneInternal();
                return retval;
            });
                uself.EditUser = ko.computed(function () {
                    var retval = '';
                    retval += getTextResource('EditUser');
                    return retval;
                });
        }
            //
            uself.GetFullInfoForTooltip = function () {
                var retval = '';
                if (uself.Type() == module.UserTypes.queueExecutor && (!self.IsClientMode || !self.IsClientMode())) {
                    retval += getTextResource('UserFullName') + ': ' + uself.FullName() + '\n';
                    if (uself.ResponsibleFullName())
                        retval += getTextResource('Responsible') + ': ' + uself.ResponsibleFullName() + '\n';
                    if (uself.QueueTypeName())
                        retval += getTextResource('QueueType') + ': ' + uself.QueueTypeName() + '\n';
                    if (uself.Note())
                        retval += getTextResource('UserNote') + ': ' + uself.Note() + '\n';
                }
                else {
                    retval += getTextResource('UserFullName') + ': ' + uself.FullName() + '\n';
                    if (uself.PositionName())
                        retval += getTextResource('UserPosition') + ': ' + uself.PositionName() + '\n';
                    if (uself.Number())
                        retval += getTextResource('UserNumber') + ': ' + uself.Number() + '\n';
                    if (uself.OrganizationName())
                        retval += getTextResource('UserOrganization') + ': ' + uself.OrganizationName() + '\n';
                    if (uself.SubdivisionFullName())
                        retval += getTextResource('UserSubdivision') + ': ' + uself.SubdivisionFullName() + '\n';
                    if (!self.IsClientMode || !self.IsClientMode()) {
                        if (uself.BuildingName())
                            retval += getTextResource('UserBuilding') + ': ' + uself.BuildingName() + '\n';
                        if (uself.FloorName())
                            retval += getTextResource('UserFloor') + ': ' + uself.FloorName() + '\n';
                        if (uself.RoomName())
                            retval += getTextResource('UserRoom') + ': ' + uself.RoomName() + '\n';
                        if (uself.WorkplaceName())
                            retval += getTextResource('UserWorkplace') + ': ' + uself.WorkplaceName() + '\n';
                        if (uself.Email())
                            retval += getTextResource('UserEmail') + ': ' + uself.Email() + '\n';
                        if (uself.PhoneString())
                            retval += getTextResource('UserPhone') + ': ' + uself.PhoneString() + '\n';
                        if (uself.Fax())
                            retval += getTextResource('UserFax') + ': ' + uself.Fax() + '\n';
                        if (uself.Other())
                            retval += getTextResource('UserOther') + ': ' + uself.Other() + '\n';
                        if (uself.Note())
                            retval += getTextResource('UserNote') + ': ' + uself.Note() + '\n';
                    }
                }
                //
                return retval;
            };
            //
            uself.ImageClass = ko.computed(function () {
                if (uself.Type() == module.UserTypes.queueExecutor || uself.Type() == module.UserTypes.organization|| uself.Type() == module.UserTypes.subdivision)
                    return 'form-user-icon-group';
                else return 'form-user-icon';
            });
            //
            uself.EditClick = function () {
                if (options.EditAction)
                    options.EditAction(uself);
            };
            uself.EditDeputyClick = function () {
                //
                require(['usualForms'], function (module) {
                    var fh = new module.formHelper(false);
                    fh.ShowDeputyUser(uself.ID(), false, uself.FullName());
                });
            };
            //
            uself.SendEmail = function () {
                showSpinner();
                require(['sdForms'], function (module) {
                    var fh = new module.formHelper(true);
                    //
                    var tmpOptions = {
                       ID: uself.ID(),
                        Email: uself.Email(),
                        CanNote: options.CanNote ? true : false,
                        Obj: {
                            ID: parentSelf.id,
                            ClassID: parentSelf.objectClassID
                        },
                    };
                    //
                    fh.ShowSendEmailForm(tmpOptions);
                });
            };
            uself.ViewEmailLink = ko.computed(function () {
                var tmp = self.IsClientMode ? !self.IsClientMode() : true;
                return tmp;
            });
            //
            uself.RemoveClick = function () {
                if (options.RemoveAction)
                    options.RemoveAction(uself);
            };
            //
            uself.ajaxControl_call = new ajaxLib.control();
            uself.CallToUser = function (vm, e) {
                var param = { userID: uself.ID() };
                uself.ajaxControl_call.Ajax($(e.target).closest('.form-user-phone'),
					{
					    dataType: "json",
					    method: 'GET',
					    url: 'accountApi/CallToUserFromMyWorkplace?' + $.param(param)
					},
                    function (result) {
                        if (result != true)
                            require(['sweetAlert'], function () {
                                swal(getTextResource('Telephony_CallError'));
                            });
                    });
            };
            //
            uself.Load();//TODO Refactor without this () and parentSelf
        },
        EmptyUser: function (parentSelf, type, editAction, showLeftSide, showTypeName, userFieldName) {
            var uself = this;
            var self = parentSelf;
            //
            uself.ShowLeftSide = ko.observable(showLeftSide === false ? false : true);
            uself.ShowTypeName = ko.observable(showTypeName === false ? false : true);
            uself.ShowRightSideButtons = ko.observable(false);
            //
            uself.Type = ko.observable(type);
            uself.EditClick = function (vm, e) {
                if (editAction)
                    editAction(uself);
                $(e.target).closest('.ui-dialog').focus();//for show search icon
            };
            //
            uself.TypeName = ko.computed(function () {
                if (userFieldName && userFieldName != '')
                    return userFieldName;
                var type = uself.Type();
                //
                if (type == module.UserTypes.accomplisher)
                    return getTextResource('Accomplisher');
                else if (type == module.UserTypes.assignor)
                    return getTextResource('Assignor');
                else if (type == module.UserTypes.client)
                    return getTextResource('Client');
                else if (type == module.UserTypes.executor)
                    return getTextResource('Executor');
                else if (type == module.UserTypes.initiator)
                    return getTextResource('Initiator');
                else if (type == module.UserTypes.owner)
                    return getTextResource('Owner');
                else if (type == module.UserTypes.workOrderInitiator)
                    return getTextResource('WorkOrderInitiator');
                else if (type == module.UserTypes.queueExecutor)
                    return getTextResource('Queue');
                else if (type == module.UserTypes.director)
                    return getTextResource('Director');
                else if (type == module.UserTypes.projectInitiator)
                    return getTextResource('ProjectInitiator');
                else if (type == module.UserTypes.workInitiator)
                    return getTextResource('ManhourWorkInitiator');
                else if (type == module.UserTypes.workExecutor)
                    return getTextResource('ManhourWorkExecutor');
                else if (type == module.UserTypes.utilizer)
                    return getTextResource('AssetNumber_UtilizerName');
                else if (type == module.UserTypes.writerOff)
                    return getTextResource('WrittenOff_UserNameOff');
                else if (type == module.UserTypes.mResponsible)
                    return getTextResource('Maintenance_UserName');
                else if (type == module.UserTypes.organization)
                    return getTextResource('UserOrganization');
                else if (type == module.UserTypes.subdivision)
                    return getTextResource('UserSubdivision');
                else if (type == module.UserTypes.inspector)
                    return getTextResource('Inspector');
                else if (type == module.UserTypes.withoutType)
                    return '';
                else return '';
            });
            //
            uself.CanEdit = ko.computed(function () {
                var type = uself.Type();
                //
                if (type == module.UserTypes.accomplisher)
                    return parentSelf.CanEdit() && editAction;
                else if (type == module.UserTypes.assignor)
                    return parentSelf.CanEdit() && editAction;
                else if (type == module.UserTypes.client)
                    return parentSelf.CanEdit() && editAction;
                else if (type == module.UserTypes.executor)
                    return parentSelf.CanEdit() && editAction;
                else if (type == module.UserTypes.initiator)
                    return parentSelf.CanEdit() && editAction;
                else if (type == module.UserTypes.owner)
                    return parentSelf.CanEdit() && editAction;
                else if (type == module.UserTypes.workOrderInitiator)
                    return parentSelf.CanEdit() && editAction;
                else if (type == module.UserTypes.workInitiator)
                    return parentSelf.CanEdit() && editAction;
                else if (type == module.UserTypes.workExecutor)
                    return parentSelf.CanEdit() && editAction;
                else if (type == module.UserTypes.queueExecutor)
                    return parentSelf.CanEdit() && editAction;
                else if (type == module.UserTypes.director)
                    return parentSelf.CanEdit() && editAction;
                else if (type == module.UserTypes.projectInitiator)
                    return parentSelf.CanEdit() && editAction;
                else if (type == module.UserTypes.utilizer)
                    return parentSelf.CanEdit() && editAction;
                else if (type == module.UserTypes.writerOff)
                    return parentSelf.CanEdit() && editAction;
                else if (type == module.UserTypes.mResponsible)
                    return parentSelf.CanEdit() && editAction;
                else if (type == module.UserTypes.withoutType)
                    return parentSelf.CanEdit() && editAction;
                else if (type == module.UserTypes.organization)
                    return parentSelf.CanEdit() && editAction;
                else if (type == module.UserTypes.subdivision)
                    return parentSelf.CanEdit() && editAction;
                else return false;
            });
        }
    };
    return module;
});