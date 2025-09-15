requirejs.config({
    baseUrl: 'scripts/',
    urlArgs: 'uniqueVector=im_' + applicationVersion,
    paths: {
        ui_controls: './../UI/Controls',
        ui_forms: './../UI/Forms',
        ui_lists: './../UI/Lists',
        ui_views: './../UI/Views',

        jquery: 'vendor/jquery-2.1.1.min',
        jqueryUI: 'vendor/jquery-ui.min',
        jmigrate: 'vendor/jquery-migrate-1.2.1',
        knockout: 'vendor/knockout-3.4.2',
        knockout_amd_helpers: 'vendor/knockout-amd-helpers.min',
        localization: 'vendor/ko.localizationbinding',
        comboBox: 'vendor/knockout.combobox',
        domReady: 'vendor/domReady',
        text: 'vendor/require.text',
        image: 'vendor/require.image',
        json: 'vendor/require.json',
        noext: 'vendor/require.noext',
        modernizr: 'vendor/modernizr-2.8.3',
        foundation: 'vendor/foundation.min',
        localStorage: 'utility/localStorage',
        fancyBox: 'vendor/jquery.fancybox.pack',
        sweetAlert: 'vendor/sweet-alert',
        jqueryMouseWheel: 'vendor/jquery.mousewheel',
        jqueryNoUIslider: 'vendor/jquery.nouislider.all.min',
        jqueryPickMeUp: 'vendor/jquery.pickmeup.min',
        jqueryTimePicker: 'vendor/jquery.timepicker',
        signalR: 'vendor/jquery.signalR-2.2.0.min',
        signalRHubs: '../signalr/hubs?',
        selectControl: 'controls/select-control',
        timePickerControl: 'controls/timepick-control',
        formControl: 'controls/form-control',
        treeControl: 'controls/treeControl',
        treeViewModel: 'controls/treeViewModel',
        plainList: 'controls/plainList',
        checkbox: 'controls/checkbox',
        //
        managedAccessObjectList: 'dataSources/managedAccessObjectList',
        navigatorTreeDataProvider: 'dataSources/navigatorTreeDataProvider',
        //
        usualForms: 'formHelpers/usualForms',
        registrationForms: 'formHelpers/registrationForms',
        sdForms: 'formHelpers/sdEntityForms',
        assetForms: 'formHelpers/assetForms',
        financeForms: 'formHelpers/financeForms',
        catalogForms: 'formHelpers/catalogForms',
        //
        spin: 'vendor/spin',
        spinner: 'utility/spinner',
        //
        ajax: 'controls/ajaxControl',
        treeAndSearchControl: 'controls/treeAndSearchControl',
        objectSearcher: 'controls/objectSearcher',
        richText: 'controls/richTextControl',
        fileControl: '../UI/Controls/FileControl/FileControl',
        htmlControl: '../UI/Controls/htmlControl/htmlControl',
        workflow: '../UI/Controls/WorkflowControl',
        assetOperations: '../UI/Forms/Asset/Controls/AssetOperationsControl',
        assetOperationsHelper: '../UI/Forms/Asset/AssetOperations/AssetOperationsHelper',
        sdTableContextMenuHelper: '../UI/Lists/ContextMenu/SDTableContextMenuHelper',
        imList: 'controls/imlist-control',
        swalForms: 'vendor/swal-forms',
        urlManager: 'utility/urlManager',
        eventManager: 'utility/eventManager',
        parametersControl: '../UI/Controls/Parameters/parametersControl',
        jqueryStepper: 'vendor/jquery.stepper',
        dateTimePicker: 'vendor/jquery.datetimepicker.full',
        tooltipster: 'vendor/tooltipster.bundle',
        tooltipsterScroll: 'vendor/tooltipster-scrollableTip',
        ttControl: 'controls/ttcontrol',
        tagsControl: 'controls/tagsEditor',
        koToolTip: 'controls/ko.tooltip',
        koSplitter: 'controls/ko.splitter',
        koFieldEditor: '../UI/Controls/ko/ko.FieldEditor',
        koTextBox: '../UI/Controls/ko/ko.TextBox',
        koNumericUpDown: '../UI/Controls/ko/ko.NumericUpDown',
        koDateTimePicker: '../UI/Controls/ko/ko.DateTimePicker',
        //
        autoClosedRegions: 'utility/autoClosedRegions',
        typeHelper: 'utility/typeHelper',
        koHelper: 'utility/ko.helper',
        iconHelper: '../UI/iconHelper',
        dateTimeControl: 'controls/dateTimeControl',
        decimal: 'utility/decimal',
        ipInput: 'utility/ipInput',
    },
    shim: {
        modernizr: {
            exports: 'Modernizr'
        },
        foundation: {
            deps: ['jquery']
        },
        jmigrate: {
            deps: ['jquery'],
            exports: "$"
        },
        jqueryUI: {
            deps: ['jquery'],
            exports: "$"
        },
        fancyBox: {
            deps: ['jquery'],
            exports: "$"
        },
        jqueryMouseWheel: {
            deps: ['jquery'],
            exports: "$"
        },
        jqueryNoUIslider: {
            deps: ['jquery'],
            exports: "$"
        },        
        jqueryPickMeUp: {
            deps: ['jquery'],
            exports: "$"
        },
        jqueryStepper: {
            deps: ['jquery'],
            exports: "$"
        },
        signalR: {
            deps: ['jquery'],
            exports: "$.connection"
        },
        signalRHubs: {
            deps: ['signalR']
        },
        jqueryTimePicker: {
            deps: ['jquery'],
            exports: "$"
        },
        swalForms: {
            deps: ['sweetAlert']
        },
        dateTimePicker: {
            deps: ['jquery', 'jqueryMouseWheel'],
            exports: "$"
        },
        tooltipster: {
            deps: ['jquery'],
            exports: "$"
        },
        tooltipsterScroll: {
            deps: ['tooltipster'],
            exports: "$"
        },
        spinner: {
            deps: ['spin']
        }
    },
    waitSeconds: 0,

    //TODO - remove?
    //onNodeCreated: function (node, config, moduleName, url) {
    //    console.log('module ' + moduleName + ' is about to be loaded');

    //    node.addEventListener('load', function () {
    //        console.log('module ' + moduleName + ' has been loaded');
    //    });

    //    node.addEventListener('error', function () {
    //        console.log('module ' + moduleName + ' has failed to be loaded');
    //    });
    //},
    //config: {
    //    text: {
    //        onXhr: function (xhr, url) {
    //            console.log('file ' + url + ' is about to be loaded');
    //        },
    //        onXhrComplete: function (xhr, url) {
    //            console.log('file ' + url + ' has been loaded');
    //        }
    //    }
    //}
});

