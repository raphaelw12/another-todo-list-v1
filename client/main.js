import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import {Session} from 'meteor/session';
import {Accounts} from 'meteor/accounts-base'

import './main.html';
import '../lib/collections.js'

Session.set('HideCompTasks',false);
Session.set('SortByComp',true);



Template.main.helpers({
	TaskAll(){
		//completed sort = -1 | incompleted sort = 1
		if(Session.get('HideCompTasks'))//if showing completed tasks is disabled
			return taskDB.find({'childTask':false, 'Status':false})//display only tasks that are incomplete
		else //otherwise
		{
			if(Session.get('SortByComp'))//if results are sorted by completion status
				return taskDB.find({'childTask':false},{sort:{Privatedby:-1,Status: -1}})//show tasks that are sorted by completion status
			else  //otherwise if they are sorted by incompletion status
				return taskDB.find({'childTask':false},{sort:{Privatedby:-1,Status: 1}})//show tasks that are sorted by completion status
		}
	},
	CompSubTask(){
		return taskDB.find({parentTask:this._id,Status:true}).count();
	},
	SubTaskCount(){
		return taskDB.find({parentTask:this._id}).count();
	},
	SubTaskCheck(){
		var sub = taskDB.findOne({'_id':this._id}).hassubtask;
		if(sub == undefined || sub == false)
			return false;
		else
			return true;
	},
	SubTaskAll(){
		return taskDB.find({parentTask:this._id});
	},
	TaskSuccessRate(){
		var ncompsub = (taskDB.find({parentTask:this._id,Status:false}).count());
		var compsub =  (taskDB.find({parentTask:this._id,Status:true}).count());
		var retval = (compsub / (ncompsub + compsub))*100;
		//console.log (compsub,ncompsub,retval,this._id);
		if (retval == 100){
			taskDB.update({'_id':this._id},{$set:{'Status':true}});
		} else {
			taskDB.update({'_id':this._id},{$set:{'Status':false}});
		}
		return retval;
	},
	CurrentStatus(){
		var val = taskDB.findOne({'_id':this._id}).Public;
    	if(val == 1)
    		return "Public";
    	else
    		return "Private";
	},
	PrivateOwner(){
		var val = taskDB.findOne({'_id':this._id}).Public;
    	if(val == 0)//if task is private
    	{
    		if(Meteor.user()){//check if user exists
				if(Meteor.user()._id == taskDB.findOne({'_id':this._id}).Privatedby){//check if user is the one who privated the task
					console.log("Private task found");
					return true;//if true, return true
				}
			}	
    	}
		return false; //return false if any of the conditions are not met
	},

	PublicOwner(){
		var val = taskDB.findOne({'_id':this._id}).Public;
    	if(val == 1)//if task is public
    	{
    		if(taskDB.findOne({'_id':this._id}).Privatedby == ""){//check if the task has any private owners
				console.log("Public task found");
				return true;//if true, return true
			}	
    	}
		return false; //return false if any of the conditions are not met
	}
})

Template.main.events({
	'click .js-delete'(event){
		var idval = this._id;
		var parentid = taskDB.findOne({'_id':this._id}).parentTask;//get parent's _id

		//when deleting a parent task
		if(taskDB.findOne({'_id':idval}).hassubtask == true){//check to see if it has subtasks
			var string_id;
			for(var k in taskDB._collection._docs._map){//loop through all tasks in the collection
				string_id = String(k);//convert their ids to strings
				if(taskDB.findOne({'_id':string_id}).parentTask == this._id)//if a task within the loop has a parentTask value matching the id of the current task being deleted
					taskDB.remove({_id:string_id});//delete it
			}
		} 

		//when deleting a sub task
		if(parentid!="")
		{
			var subtasksleft = taskDB.find({parentTask:parentid}).count() - 1; //count the remaining entries belonging to the parent (subtract 1 to account for the one just deleted)
			if (subtasksleft == 0){//if none are found
				taskDB.update({'_id':parentid},{$set:{'hassubtask':false}});// set the parents hassubtask to false
				console.log("reset hassubtask to false");
			}
		}

		$("#" +idval).fadeOut("slow","swing",function(){
			taskDB.remove({_id:idval});
		});
		
	},
	'click .js-savesub'(event){
		var modalname = '#addSubTaskModal' + this._id;
		var title = $('#addTitle' + this._id).val();
		$('#addTitle' + this._id).val('');
		if(title == undefined || title == ""){
			alert("A title is required to create a task.");
		} else {
			$(modalname).modal('hide');
			taskDB.insert({'TaskName':title, 'Status':false, 'hassubtask':false, 'parentTask':this._id, 'childTask':true});
			taskDB.update({'_id':this._id},{$set:{'hassubtask':true, 'Status':false}});
		}
	},

	'click .js-closeAddsubModal'(event){
		$('#addTitle' + this._id).val('');
		$('#addDesc' + this._id).val('');
	},
	'click .js-statuschange'(event,instance){
		var elementname = "#setTaskStatus" + this._id;
		// var modalname = "#taskInfoModal" + this._id;
		// var prevval = taskDB.findOne({'_id':this._id}).Public
		var idval = this._id;
		var val = $(elementname).val();
		if(val == 0){
			taskDB.update({'_id':idval},{$set:{'Public':val,'Privatedby':Meteor.user()._id}});
		} else {
			taskDB.update({'_id':idval},{$set:{'Public':val,'Privatedby':""}});	
		}
		// if(prevval != val){
		// 	console.log("hiding ",modalname);
		// 	$(modalname).modal("hide");
		// }
	},
	'click .js-hcomptasks'(event){
		if(!(Session.get('HideCompTasks')))
			Session.set('HideCompTasks',true);
		else
			Session.set('HideCompTasks',false);
	},
	'click .js-sortcomp'(event){
		Session.set('HideCompTasks',false);
		Session.set('SortByComp',true);
	},
	'click .js-showall'(event){
		Session.set('HideCompTasks',false);
		Session.set('SortByComp',true);
	},
	'click .js-sortincomp'(event){
		Session.set('HideCompTasks',false);
		Session.set('SortByComp',false);
	},
	'click .js-getcheck'(event){
		var elementname = "taskCheck" + this._id;
		var val = document.getElementById(elementname);
		taskDB.update({'_id':this._id},{$set:{'Status':val.checked}});
	}
})

Template.addTask.events({
	'click .js-save'(event){
		var title = $('#addTitle').val();
		var desc = $('#addDesc').val();
		$('#addTitle').val('');
		$('#addDesc').val('');

		if(desc == undefined || desc ==""){
			desc = "No description available."
		}
		if(title == undefined || title == ""){
			alert("A title is required to create a task.");
		} else {
			$('#addTaskModal').modal('hide');
			taskDB.insert({'TaskName':title, 'Desc':desc, 'Status':false, 'hassubtask':false, 'parentTask':"", 'childTask':false, 'Public':1, 'Privatedby':""});	
		}
	},
	'click .js-closeAddModal'(event){
		$('#addTitle').val('');
		$('#addDesc').val('');
	}
})
