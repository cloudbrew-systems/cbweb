function dataSubmit(url, data, btn_elem, callback)
{
	if(btn_elem != false) {
		var html = btn_elem.html();
		btn_elem.html('Processing...'); 
		btn_elem.attr('disabled','disabled');
	}
	$.ajax({
		url : url,
		type : 'POST',
		data: data,
        dataType: 'json',
		beforeSend: function() {
		
		},	
		complete: function() {
			if(btn_elem != false) {
				btn_elem.removeAttr('disabled');
				btn_elem.html(html);
			}
		},
		success: function(json) {
			callback(json);			
		},
		error: function() {
			
		}
	});
}

function validateformSubmit(url, div_id, btn_elem, callback)
{
	if($('#'+div_id).parsley().validate()) {
		var html = btn_elem.html();
		btn_elem.html('Processing...'); 
		btn_elem.attr('disabled','disabled');
		data = $('#'+div_id).serialize();
		$.ajax({
			url : url,
			type : 'POST',
			data: data,
	        dataType: 'json',
			beforeSend: function() {
			
			},	
			complete: function() {
				btn_elem.removeAttr('disabled');
				btn_elem.html(html);
			},
			success: function(json) {
				callback(json);			
			},
			error: function() {
				
			}
		});
	} else {
		return false;
	}
}

function formSubmit(url, div_id, btn_elem, callback)
{
	var html = btn_elem.html();
	btn_elem.html('Processing...'); 
	btn_elem.attr('disabled','disabled');
	data = $('#'+div_id).serialize();
	$.ajax({
		url : url,
		type : 'POST',
		data: data,
        dataType: 'json',
		beforeSend: function() {
		
		},	
		complete: function() {
			btn_elem.removeAttr('disabled');
			btn_elem.html(html);
		},
		success: function(json) {
			callback(json);			
		},
		error: function() {
			
		}
	});
}

function fileupload(div_id,url) {
	var form = $('#'+div_id)[0];
	var formData = new FormData(form);
	$.ajax({
		url: url,
		type: 'POST',
	    data: formData,
	    // THIS MUST BE DONE FOR FILE UPLOADING
	    contentType: false,
	    processData: false,
	    beforeSend: function() {
			$('.dropify-clear').click();
			UIkit.modal("#spinner_dialogue",{bgclose:false}).show();
		},	
		complete: function() {
			
		},
		success: function(json) {
			if (json.success === 1) {
				var data = new Array();
				data.push({name:'token',value:json.token});
				data.push({name:'file',value:json.filename});
				dataSubmit('/api/fileuploadcheck', data, false, pollfileupload)
			} else if(json.success === 0) {
				UIkit.modal("#spinner_dialogue").hide();
       			UIkit.notify({
				    message : 'File Upload Error: '+json.msg,
				    status  : 'danger',
				    timeout : 5000,
				    pos     : 'top-center'
				});
			}
		},
		error: function() {
			
		}
	});
}

function pollfileupload(data) {
	if (data.success === 1) {
		// setTimeout(function(){
		var polldata = new Array();
		polldata.push({name:'token',value:data.token});
		polldata.push({name:'file',value:data.filename});
		dataSubmit('/api/fileuploadcheck', polldata, false, pollfileupload);
		// },1000);
	} else if (data.success === 0) {
		altair_md.init();
		var html = '';
		html += '<div id="'+data._id+'">';
        html += '<div class="md-card md-card-hover md-card-overlay" style="border-radius: 15px;">';
      	html += '<div class="md-card-content">';
        html += '<div>';
        html += '<img src="/images/file.png" style="height: 110px;">';
        html += '<div style="z-index: 1000;margin-top: -40px;">';
        html += data.filetype.toUpperCase();
        html += '</div>';
        html += '</div>';
        html += '</div>';
        html += '<div class="md-card-overlay-content">';
        html += '<div class="uk-clearfix md-card-overlay-header">';
        html += '<i class="md-icon material-icons md-card-overlay-toggler">&#xE5D4;</i>';
        html += '<h3>';
        html += data.filename;
        html += '</h3>';
        html += '</div>';
        html += '<p>';
        html += '<strong>Name: </strong> '+data.filename;
        html += '<br/>';
        if(typeof(data.filesize) !== 'undefined') {
	        html += '<strong>Size: </strong> ';
	        if((parseInt(data.filesize) / 1073741824) > 1) {
	        	html += (parseInt(data.filesize) / 1073741824).toFixed(2) + ' GB';
	        } else if((parseInt(data.filesize) / 1048576) > 1) {
	        	html += (parseInt(data.filesize) / 1048576).toFixed(2) + ' MB';
	        } else if((parseInt(data.filesize) / 1024) > 1) {
	        	html += (parseInt(data.filesize) / 1024).toFixed(2) + ' KB';
	        } else {
	        	html += data.filesize + ' B';
	        }
	        html += '<br/>';
    	}
        html += '</p>';
        html += '<div class="uk-grid uk-grid-small">';
        html += '<div class="uk-width-medium-1-2">';
        html += '<button class="md-btn md-btn-success md-btn-block md-btn-wave-light waves-effect waves-button waves-light" onclick="downloadfile(\''+data._id+'\', false)" title="Download File">';
        html += '<i class="material-icons md-24 md-color-white">&#xE2C0;</i>';
        html += '</button>';
        html += '</div>';
        html += '<div class="uk-width-medium-1-2">';
        html += '<button class="md-btn md-btn-danger md-btn-block md-btn-wave-light waves-effect waves-button waves-light" onclick="UIkit.modal.confirm(\'Do you really want to delete this file?\', function(){ deletefile(\''+data._id+'\', false); });" title="Delete File">';
        html += '<i class="material-icons md-24 md-color-white">&#xE872;</i>';
        html += '</button>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        html += '</div>';
        $('#file_grid').append(html);
        altair_md.init();
        html = '';
        UIkit.modal("#spinner_dialogue").hide();
    }
}

function signin(data) {
	if(data.success === 0) {
		$('#login_error').text(data.msg);
		$('#login_error_div').fadeIn('280');
		setTimeout(function(){
			$('#login_error_div').fadeOut('280');
			$('#login_error').text('');
		},3000);
	} else if(data.success === 1) {
		window.location.href = '/api/console';
	}
}

function signup(data) {
	if(data.success === 0) {
		$('#registration_error').text(data.msg);
		$('#registration_error_div').fadeIn('280');
		setTimeout(function(){
			$('#registration_error_div').fadeOut('280');
			$('#registration_error').text('');
		},3000);
	} else if(data.success === 1) {
		window.location.href = '/api/console';
	} else if (data.success === 2) {
		$('#registration_error').html(data.msg+' <a href="/subscribe">Subscribe</a> to get an invite');
		$('#registration_error_div').fadeIn('280');
	}
}

function resetcallback(data) {
	if (data.success === 1) {
		$('#reset_success').text(data.msg);
		$('#reset_success_div').fadeIn('280');
		setTimeout(function(){
			$('#reset_success_div').fadeOut('280');
			$('#reset_success').text('');
		},3000);
	} else {
		$('#reset_error').text(data.msg);
		$('#reset_error_div').fadeIn('280');
		setTimeout(function(){
			$('#reset_error_div').fadeOut('280');
			$('#reset_error').text('');
		},3000);
	}
}

function checkmail(data) {
	if(data.success === 1) {
		$('#email_check').fadeOut('200');
		$('#register_email').val(data.email);
		$('#register_email').attr('readonly',true);
		$('#signup_form').fadeIn('200');
	} else if(data.success === 0) {
		$('#checkemail_error').html(data.msg);
		$('#checkemail_error_div').fadeIn('280');
		setTimeout(function(){
			$('#checkemail_error_div').fadeOut('280');
			$('#checkemail_error').text('');
		},3000);
	}else if (data.success === 2) {
		$('#checkemail_error').html(data.msg+' <a href="/subscribe">Subscribe</a> to get an invite');
		$('#checkemail_error_div').fadeIn('280');
	}
}

function downloadfile(id, btn_elem) {
	UIkit.modal("#spinner_dialogue",{bgclose:false}).show();
	var data = new Array();
	data.push({name:'token', value: id });
	dataSubmit('/api/filedownlaod', data, btn_elem, checkfiledownload);
}

function checkfiledownload(data) {
	if (data.success === 1) {
		var polldata = new Array();
		polldata.push({name: 'token', value: data.token});
		polldata.push({name: 'file', value: data.file});
		dataSubmit('/api/filedownloadcheck', polldata, false, checkfiledownload);
	} else if(data.success === 0) {
		UIkit.modal("#spinner_dialogue").hide();
		var filedata=data.file;
	  	$('<form action="/api/download" method="POST">' + 
	    	'<input type="hidden" name="file" value="' + filedata+ '">' +
	    	'</form>').appendTo('body').submit();
	} else {
		UIkit.modal("#spinner_dialogue").hide();
		console.log('Some error has occured');
	}
}

function resetcomplete(data) {
	if (data.success === 1) {
		$('#reset_success').text(data.msg);
		$('#reset_success_div').fadeIn('280');
		setTimeout(function(){
			$('#reset_success_div').fadeOut('280');
			$('#reset_success').text('');
			window.location.href = '/login';
		},3000);
	} else {
		$('#reset_error').text(data.msg);
		$('#reset_error_div').fadeIn('280');
		setTimeout(function(){
			$('#reset_error_div').fadeOut('280');
			$('#reset_error').text('');
		},3000);
	}
}

function deletefile(id, btn_elem) {
	UIkit.modal("#spinner_dialogue",{bgclose:false}).show();
	var data = new Array();
	data.push({name:'token', value: id });
	dataSubmit('/api/filedelete', data, btn_elem, completefiledelete);
}

function completefiledelete(data) {
	if (data.success === 1 ) {
		if ($('#file_'+data.token).length > 0) {
			altair_md.init();
			$('#file_'+data.token).remove();
			altair_md.init();
			UIkit.modal("#spinner_dialogue").hide();
		}
	} else {
		UIkit.modal("#spinner_dialogue").hide();
	}
}