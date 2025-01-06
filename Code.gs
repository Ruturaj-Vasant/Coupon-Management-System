function doGet(e) {
  if (e.parameter.id) {
    return handleQRScan(e.parameter.id);
  }
  return HtmlService.createHtmlOutputFromFile('index')
    .setTitle('NYU Coupon Generator')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function handleQRScan(id) {
  var template = HtmlService.createTemplateFromFile('qr_scan_form');
  template.id = id;
  return template.evaluate()
    .setTitle('NYU Digital Pass')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}


function sendEmailNotification(userData, couponResult) {
  const emailSubject = 'Your NYU Digital Pass';
  const emailBody = `
    Dear ${userData.name},

    Thank you for requesting your digital pass. You can access your pass using the link below:

    ${couponResult.passUrl}

    Pass Details:
    - Expiration Date: ${couponResult.expirationDate}
    - Discount Amount: $${couponResult.discountAmount}

    If you have any questions, please don't hesitate to contact us.

    Best regards,
    NYU Team
  `;

  MailApp.sendEmail({
    to: userData.email,
    subject: emailSubject,
    body: emailBody
  });
}

function updateSheet(formData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let couponSheet = ss.getSheetByName('Coupon Data');
    
    if (!couponSheet) {
      couponSheet = ss.insertSheet('Coupon Data');
    }

    if (couponSheet.getLastRow() === 0) {
      const headers = [
        'ID',
        'Creation Date',
        'Expiration Date',
        'Service Type',
        'Discount Amount',
        'Uses Allowed',
        'Remaining Uses',
        'Status'
      ];
      couponSheet.appendRow(headers);
      
      const headerRange = couponSheet.getRange(1, 1, 1, headers.length);
      headerRange.setBackground('#f3f3f3');
      headerRange.setFontWeight('bold');
      headerRange.setHorizontalAlignment('center');
    }

    const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "MM/dd/yyyy HH:mm:ss");
    const id = Utilities.getUuid();
    
    couponSheet.appendRow([
      id,
      timestamp,
      formData.expirationDate,
      formData.serviceType,
      parseFloat(formData.discountAmount),
      formData.usesAllowed,
      formData.usesAllowed,
      'Active'
    ]);

    couponSheet.autoResizeColumns(1, 8);
    const qrCodeUrl = generateQRCode(id);
    
    return {
      success: true,
      message: "Coupon generated successfully!",
      qrCodeUrl: qrCodeUrl,
      couponDetails: {
        id: id,
        description: `${formData.serviceType} - $${formData.discountAmount} off`,
        expiryDate: formData.expirationDate,
        usesLeft: formData.usesAllowed
      }
    };
  } catch (error) {
    console.error("Error:", error);
    return { success: false, message: "Error generating coupon: " + error.message };
  }
}

function generateQRCode(id) {
  var webAppUrl = ScriptApp.getService().getUrl();
  return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(webAppUrl + "?id=" + id)}`;
}


function getAndRedeemCoupon(id, userData) {
    var couponSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Coupon Data');
    var data = couponSheet.getDataRange().getValues();
    
    // Debug log for input parameters
    Logger.log('Input ID:', id);
    Logger.log('User Data:', JSON.stringify(userData));
    
    var row = -1;
    for (var i = 1; i < data.length; i++) {
        if (data[i][0] === id) {
            row = i;
            break;
        }
    }
    
    if (row === -1) {
        Logger.log('Row not found for ID:', id);
        return { success: false, message: 'Invalid Coupon' };
    }

    var formData = {
        expirationDate: data[row][2],    // Column C: Expiration Date
        serviceType: data[row][3],       // Column D: Service Type
        discountAmount: data[row][4],    // Column E: Discount Amount
        usesAllowed: data[row][5],       // Column F: Uses Allowed
        remainingUses: data[row][6],     // Column G: Remaining Uses
        status: data[row][7],            // Column H: Status
        userName: userData.name,
        userEmail: userData.email,
        userPhone: userData.phone
    };

    // Validate coupon
    if (formData.status !== 'Active') {
        return { success: false, message: 'Coupon is not active' };
    }

    if (formData.remainingUses !== 'unlimited' && formData.remainingUses <= 0) {
        return { success: false, message: 'Coupon has no uses left' };
    }

    // Create PassKit coupon
    var couponResult = createCoupon(formData);
    
    if (!couponResult.success) {
        Logger.log('Coupon creation failed:', couponResult.error || 'Unknown error');
        return { 
            success: false, 
            message: 'Failed to generate digital pass. Error: ' + (couponResult.error || 'Unknown error')
        };
    }

    // Update remaining uses after successful coupon creation
    if (formData.remainingUses !== 'unlimited') {
        var newUsesLeft = formData.remainingUses - 1;
        couponSheet.getRange(row + 1, 7).setValue(newUsesLeft);
        
        if (newUsesLeft === 0) {
            couponSheet.getRange(row + 1, 8).setValue('Inactive');
        }
    }

    return {
        success: true,
        passUrl: couponResult.url,
        couponId: id,
        expirationDate: formData.expirationDate,
        discountAmount: formData.discountAmount
    };
}


function saveUserData(userData, result) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var userSheet = ss.getSheetByName('User Data');
  
  if (!userSheet) {
    userSheet = ss.insertSheet('User Data');
  }
  
  if (userSheet.getLastRow() === 0) {
    var headers = [
      'Timestamp', 'Coupon ID', 'Name', 'Email', 'Phone', 'Expiry Date', 'Discount Amount', 'Pass URL'
    ];
    userSheet.appendRow(headers);
    
    var headerRange = userSheet.getRange(1, 1, 1, headers.length);
    headerRange.setBackground('#f3f3f3');
    headerRange.setFontWeight('bold');
    headerRange.setHorizontalAlignment('center');
  }
  
  userSheet.appendRow([
    new Date(),
    userData.couponId,
    userData.name,
    userData.email,
    userData.phone,
    result.expirationDate,
    result.discountAmount,
    result.passUrl
  ]);
}

function sendPassEmail(userEmail, passUrl, userName) {
  try {
    const emailSubject = "Your NYU Digital Pass";
    const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      
      <div style="background-color: #57068c; padding: 2px;">
        <div style="background-color: #ffffff; padding: 20px; border: 1px solid #e0e0e0;">
          <p style="color: #333333; font-size: 16px;">Dear ${userName},</p>
          
          <p style="color: #333333; font-size: 16px;">Thank you for requesting an NYU Digital Pass. Your pass is ready and can be accessed using the button below:</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${passUrl}" style="background-color: #57068c; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Access Your Pass</a>
          </div>
          
          <div style="background-color: #f8f8f8; padding: 20px; margin: 20px 0; border-left: 4px solid #57068c;">
            <p style="color: #333333; font-size: 16px; font-weight: bold; margin-bottom: 15px;">Important Notes:</p>
            <ul style="color: #333333; font-size: 14px; margin: 0; padding-left: 20px;">
              <li style="margin-bottom: 10px;">This is a one-time use pass</li>
              <li style="margin-bottom: 10px;">Please save this pass to your digital wallet</li>
              <li style="margin-bottom: 10px;">The pass must be shown at the time of redemption</li>
              <li style="margin-bottom: 10px;">This pass cannot be transferred to another person</li>
            </ul>
          </div>
          
          <p style="color: #666666; font-size: 14px;">If you have any questions or issues accessing your pass, please contact support.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0;">
            <p style="color: #666666; font-size: 14px; margin: 0;">Best regards,<br>NYU Digital Pass Team</p>
          </div>
        </div>
      </div>
      
      <div style="text-align: center; margin-top: 20px;">
        <p style="color: #666666; font-size: 12px;">This is an automated message, please do not reply to this email.</p>
      </div>
    </div>
    `;

   
    const plainBody = `
Dear ${userName},

Thank you for requesting an NYU Digital Pass. Your pass is ready and can be accessed using the link below:

${passUrl}

Important Notes:
• This is a one-time use pass
• Please save this pass to your digital wallet
• The pass must be shown at the time of redemption
• This pass cannot be transferred to another person

If you have any questions or issues accessing your pass, please contact support.

Best regards,
NYU Digital Pass Team
    `;

    MailApp.sendEmail({
      to: userEmail,
      subject: emailSubject,
      htmlBody: htmlBody,
      body: plainBody
    });

    Logger.log(`Email sent successfully to ${userEmail}`);
    return { success: true };
    
  } catch (error) {
    Logger.log(`Error sending email: ${error.toString()}`);
    return { 
      success: false, 
      error: error.toString() 
    };
  }
}

function processUserDataAndCreateCoupon(userData) {
  var result = getAndRedeemCoupon(userData.couponId, userData);
  if (result.success) {
    try {
      // Save user data
      saveUserData(userData, result);
      
      
      var emailResult = sendPassEmail(
        userData.email,
        result.passUrl,
        userData.name
      );
      Logger.log('Email sending result: ' + JSON.stringify(emailResult));
      
      return {
        success: true,
        passUrl: result.passUrl,
        message: 'Pass created successfully! Redirecting to your pass...'
      };
    } catch (error) {
      Logger.log('Error in process: ' + error.toString());
      return {
        success: false,
        message: 'Error processing request: ' + error.toString()
      };
    }
  }
  return {
    success: false,
    message: result.message
  };
}

