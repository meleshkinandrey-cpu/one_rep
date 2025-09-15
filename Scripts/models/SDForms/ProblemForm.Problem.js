define(['knockout', 'jquery', 'models/SDForms/SDForm.User'], function (ko, $, userLib) {
	var module = {
		Problem: function (parentSelf, pData) {
			var pself = this;
			var self = parentSelf;
		    //
			pself.ClassID = 702;
			//
			if (pData.ID)
				pself.ID = ko.observable(pData.ID)
			else pself.ID = ko.observable('');
			if (pData.Number)
				pself.Number = ko.observable(pData.Number)
			else pself.Number = ko.observable('');
			if (pData.UrgencyID)
				pself.UrgencyID = ko.observable(pData.UrgencyID)
			else pself.UrgencyID = ko.observable('');
			if (pData.UrgencyName)
				pself.UrgencyName = ko.observable(pData.UrgencyName)
			else pself.UrgencyName = ko.observable('');
			if (pData.InfluenceID)
				pself.InfluenceID = ko.observable(pData.InfluenceID)
			else pself.InfluenceID = ko.observable('');
			if (pData.InfluenceName)
				pself.InfluenceName = ko.observable(pData.InfluenceName)
			else pself.InfluenceName = ko.observable('');
			if (pData.EntityStateID)
				pself.EntityStateID = ko.observable(pData.EntityStateID)
			else pself.EntityStateID = ko.observable('');
		    //
			if (pData.WorkflowSchemeID)
			    pself.WorkflowSchemeID = ko.observable(pData.WorkflowSchemeID);
			else pself.WorkflowSchemeID = ko.observable(null);
            //
			if (pData.EntityStateName)
				pself.EntityStateName = ko.observable(pData.EntityStateName)
			else pself.EntityStateName = ko.observable('');		    
			pself.WorkflowImageSource = ko.observable(pData.WorkflowImageSource ? pData.WorkflowImageSource : null);
			if (pData.TypeName)
				pself.TypeName = ko.observable(pData.TypeName)
			else pself.TypeName = ko.observable('');
			if (pData.TypeID)
				pself.TypeID = ko.observable(pData.TypeID)
			else pself.TypeID = ko.observable('');
			if (pData.PriorityName)
				pself.PriorityName = ko.observable(pData.PriorityName)
			else pself.PriorityName = ko.observable('');
			if (pData.PriorityColor)
			    pself.PriorityColor = ko.observable(pData.PriorityColor)
			else pself.PriorityColor = ko.observable('');
			if (pData.PriorityID)
				pself.PriorityID = ko.observable(pData.PriorityID)
			else pself.PriorityID = ko.observable('');
			if (pData.Summary)
				pself.Summary = ko.observable(pData.Summary)
			else pself.Summary = ko.observable('');
			if (pData.Description)
				pself.Description = ko.observable(pData.Description)
			else pself.Description = ko.observable('');
			if (pData.Solution)
				pself.Solution = ko.observable(pData.Solution)
			else pself.Solution = ko.observable('');
			if (pData.Cause)
				pself.Cause = ko.observable(pData.Cause)
			else pself.Cause = ko.observable('');
			if (pData.Fix)
				pself.Fix = ko.observable(pData.Fix)
			else pself.Fix = ko.observable('');
			//
			if (pData.OwnerID)
				pself.OwnerID = ko.observable(pData.OwnerID)
			else pself.OwnerID = ko.observable('');
			pself.OwnerLoaded = ko.observable(false);
			pself.Owner = ko.observable(new userLib.EmptyUser(parentSelf, userLib.UserTypes.owner, parentSelf.EditOwner));
			//
			if (pData.UtcDateDetected)
				pself.UtcDateDetected = ko.observable(parseDate(pData.UtcDateDetected))
			else pself.UtcDateDetected = ko.observable('');
			if (pData.UtcDatePromised)
				pself.UtcDatePromised = ko.observable(parseDate(pData.UtcDatePromised))
			else pself.UtcDatePromised = ko.observable('');
			if (pData.UtcDatePromised)
			    pself.UtcDatePromisedDT = ko.observable(new Date(parseInt(pData.UtcDatePromised)));
			else pself.UtcDatePromisedDT = ko.observable(null);
            //
			if (pData.UtcDateClosed)
				pself.UtcDateClosed = ko.observable(parseDate(pData.UtcDateClosed))
			else pself.UtcDateClosed = ko.observable('');
			if (pData.UtcDateSolved)
				pself.UtcDateSolved = ko.observable(parseDate(pData.UtcDateSolved))
			else pself.UtcDateSolved = ko.observable('');
			if (pData.UtcDateModified)
				pself.UtcDateModified = ko.observable(parseDate(pData.UtcDateModified))
			else pself.UtcDateModified = ko.observable('');
			//
			if (pData.NegotiationCount)
				pself.NegotiationCount = ko.observable(pData.NegotiationCount);
			else pself.NegotiationCount = ko.observable(0);
			if (pData.HaveUnvotedNegotiation != null)
			    pself.HaveUnvotedNegotiation = ko.observable(pData.HaveUnvotedNegotiation);
			else pself.HaveUnvotedNegotiation = ko.observable(false);
			//
			if (pData.UnreadNoteCount)
				pself.UnreadNoteCount = ko.observable(pData.UnreadNoteCount);
			else pself.UnreadNoteCount = ko.observable(0);
			if (pData.NoteCount)
			    pself.NoteCount = ko.observable(pData.NoteCount);
			else pself.NoteCount = ko.observable(0);
			pself.TotalNotesCount = ko.computed(function () {
			    return parseInt(pself.NoteCount());
			});
			//
			if (pData.DependencyObjectCount)
				pself.DependencyObjectCount = ko.observable(pData.DependencyObjectCount);
			else pself.DependencyObjectCount = ko.observable(0);
			//
			if (pData.WorkOrderCount)
				pself.WorkOrderCount = ko.observable(pData.WorkOrderCount);
			else pself.WorkOrderCount = ko.observable(0);
			//
			if (pData.CallCount)
				pself.CallCount = ko.observable(pData.CallCount);
			else pself.CallCount = ko.observable(0);
			if (pData.ManHours)
				pself.ManHours = ko.observable(pData.ManHours)
			else pself.ManHours = ko.observable('');
			if (pData.ManhoursNorm)
				pself.ManhoursNorm = ko.observable(pData.ManhoursNorm)
			else pself.ManhoursNorm = ko.observable(0);
		    //
			pself.ManhoursNormString = ko.computed(function () {
			    return getLocaleHourMinString(pself.ManhoursNorm());
		    });
			if (pData.ProblemCauseID)
				pself.ProblemCauseID = ko.observable(pData.ProblemCauseID)
			else pself.ProblemCauseID = ko.observable('');
			if (pData.ProblemCauseName)
				pself.ProblemCauseName = ko.observable(pData.ProblemCauseName)
			else pself.ProblemCauseName = ko.observable('');
			//
			pself.NumberName = ko.computed(function () {
				return '№' + pself.Number() + ' ' + pself.Summary();
			});
			//
			if (pData.OnWorkOrderExecutorControl)
				pself.OnWorkOrderExecutorControl = ko.observable(pData.OnWorkOrderExecutorControl);
			else pself.OnWorkOrderExecutorControl = ko.observable(false);
		    //
			pself.UserField1 = ko.observable(pData.UserField1 ? pData.UserField1 : '');
			pself.UserField2 = ko.observable(pData.UserField2 ? pData.UserField2 : '');
			pself.UserField3 = ko.observable(pData.UserField3 ? pData.UserField3 : '');
			pself.UserField4 = ko.observable(pData.UserField4 ? pData.UserField4 : '');
			pself.UserField5 = ko.observable(pData.UserField5 ? pData.UserField5 : '');
		    //
			pself.UserField1Name = pData.UserField1Name;
			pself.UserField2Name = pData.UserField2Name;
			pself.UserField3Name = pData.UserField3Name;
			pself.UserField4Name = pData.UserField4Name;
			pself.UserField5Name = pData.UserField5Name;
		    //
			pself.CallList = pData.CallList;//список связанных заявок (при создании проблемы по заявке)
		    //
			pself.AddAs = function () {
			    return pself.ID() && pself.ID() !== '00000000-0000-0000-0000-000000000000';
			};
		    //
			pself.AddByCallList = function () {
			    return pself.CallList !== null && pself.CallList.length !== 0;
			};
		}
	};
	return module;
});