///////////////////////////////////////////////////////////////////////////////
var playMode = "";
var displayMode = "free";
// get card data from user form input 
var cardList = AppClient.getParameters("c_#");
var hideNum = AppClient.getParameter("hideNum");

///////////////////////////////////////////////////////////////////////////////
// Some counters for Media elements
///////////////////////////////////////////////////////////////////////////////
var videoCardLetters = new Array();
var audioCardLetters = new Array();
///////////////////////////////////////////////////////////////////////////////
function getLetterForNumber(i){
 var s = "";
 while(i > 0){ s += String.fromCharCode(64+i%26); i = i - 26; } 
 return s;
}
///////////////////////////////////////////////////////////////////////////////
// on app init - after connection to learningapps.org server established
///////////////////////////////////////////////////////////////////////////////
AppClient.onInit = function(){
  if(AppClient.getParameters("display").isEqual(AppClient.getTranslation("frei"))) displayMode = "free";
  if(AppClient.getParameters("display").isEqual(AppClient.getTranslation("horizontal"))) displayMode = "horizontal";
  if(AppClient.getParameters("display").isEqual(AppClient.getTranslation("vertikal"))) displayMode = "vertical";
  
  $("#cards").append('<div id="checksolutionBtnPanel"><div id="checkSolutionBtn" onclick="AppClient.checkSolution()">'+
                     '<i class="glyphicon glyphicon-check"></i></div></div>'); 

  var from = AppClient.getParameter("from"); 
  var to = AppClient.getParameter("to"); 
  if(from != "") $("#cards").append('<div class="fromLabel '+displayMode+'">'+from+'</div>');
  if(to != "") $("#cards").append('<div class="toLabel '+displayMode+'">'+to+'</div>');
 
  var i;
 
  // count media cards for random letters (Audio A, Audio B, Audio C)
  // we want to shuffel them in order to make it not so easy
  // we have to count all parameters before creating cards
  // we can random choose from LetterArray for each card later
  var audioCardCounter = 1;
  var videoCardCounter = 1;
  for(i = 0; i < cardList.length; i++){
    if(cardList[i].value !== "" && cardList[i].value !== "") {
       // both pairs have some user input
       if(cardList[i].media == "speech" || 
          cardList[i].media == "audio") audioCardLetters.push(getLetterForNumber(audioCardCounter++));
       if(cardList[i].media == "video") videoCardLetters.push(getLetterForNumber(videoCardCounter++));
    }
  }

  // read cards from user form input and add cards to display
  for(i = 0; i < cardList.length; i++){
    if(cardList[i].value !== "") {
       // create cards and attach card objects to there parameter for later use
       cardList[i].card = addCard(cardList[i]);
    } else {
       // this card is incomplete or unused delete it 
       cardList.remove(i);
       i--;
    }
  }
   // find all matching cards - special case: there might be equal cards in other pairs
  for(i = 0; i < cardList.length; i++){
    cardList[i].card.matchingCards = new Array();
    for(var z = 0; z < cardList.length; z++){
      if(cardList[i].isEqual(cardList[z]))
         cardList[i].card.matchingCards.push(cardList[z].card);
    }
  }

  // set initial position of cards not too random, spread them out
  if(displayMode == "free")
    AppClient.forceSpreadElements($(".card"),document.getElementById("cards"),refreshCardPositionIndex,function(){
      // when correct, mix once again 
      var correct = true;
      for(var i = 0; i < cardList.length; i++){
       card = cardList[i].card; 
       if(card.indexPosition != i+1) correct = false;
      }
      if(correct) AppClient.forceSpreadElements($(".card"),document.getElementById("cards"),refreshCardPositionIndex);
    });
  
  if(displayMode == "vertical")
    for(var i=0; i < cardList.length; i++){
      cardList[i].card.htmlElement.css("top",(Math.random()*1000)+"px");
    }

  if(displayMode == "horizontal")
    for(var i=0; i < cardList.length; i++){
      cardList[i].card.htmlElement.css("left",(Math.random()*1000)+"px");
    }
  // resize cards to match screen size, trigger twice because of font resize effects
  resizeWindow();
  setTimeout(resizeWindow,100);
  $(window).on('resize', resizeWindow);
  $("#usabilityHint").delay(1000).fadeIn();
};
///////////////////////////////////////////////////////////////////////////////
function getRandomLetterFromList(type){
  var r = 0;
  if(type == "audio") {
    r = AppClient.random(audioCardLetters.length);
    return audioCardLetters.splice(r,1);
  }
  if(type == "video") {
    r = AppClient.random(videoCardLetters.length);
    return videoCardLetters.splice(r,1);
  }
}
///////////////////////////////////////////////////////////////////////////////
// add a new card to table
///////////////////////////////////////////////////////////////////////////////
function addCard(parameter){ 
 // each card has a card object containing some properties
 var card = new Object(); 
 card.attached = null;
 card.attachedTo = null;
 card.parameter = parameter;

 // build some inner html content for each card based on its type 
 if(parameter.media == "text"){
  card.innerHTML = '<span unselectable="on" class="resizeText">'+AppClient.linkifyText(parameter.value)+'</span>';
 }
 if(parameter.media == "image"){
  card.innerHTML = '<img src="'+parameter.value+'" alt=""/>';
 } 
 if(parameter.media == "speech"){
  card.innerHTML = '<div class="playMediaBtn"><span class="glyphicon glyphicon-headphones"></span> '+
                   'Audio '+ getRandomLetterFromList("audio")+'</div>';
 } 
 if(parameter.media == "audio"){
  card.innerHTML = '<div class="playMediaBtn"><span class="glyphicon glyphicon-headphones"></span> '+
                   'Audio '+ getRandomLetterFromList("audio")+'</div>'; 
 }
 if(parameter.media == "video"){
  card.innerHTML = '<div class="playMediaBtn"><span class="glyphicon glyphicon-film"></span> '+
                   'Video '+ getRandomLetterFromList("video")+'</div><img class="videoThumb" src="'+parameter.thumbURL+'" alt=""/>';
 }
 
 // build the card html element with pin, tape and hint if available
 var html = $('<div class="card '+displayMode+'">'+(hideNum != 'true' ? '<div class="numberpanel"><div class="num"></div></div>':'')+'<div class="pin"></div>'+
              (card.parameter.hint !== "" ?
                '<span class="hintbtn hintbtn_'+card.parameter.media+' popovers"'+ 
                ' data-container="#cards" data-toggle="popover" data-placement="auto"'+
               ' data-content="'+AppClient.linkifyText(card.parameter.hintTTS == '2' ? '' : card.parameter.hint).replace(/"/g,'&quot;')+'">'+
                '<span class="glyphicon glyphicon-info-sign infoicon"></span></span>'
               : '')+
              card.innerHTML+'</div>');

 html.css({"left":Math.round(Math.random*20-10)+"px","top":Math.round(Math.random*20-10)+"px"});
 card.htmlElement = html; // this is the html Element for this card
 html.data("card",card);  // we also add the card object to the html Element, 
                          // so we can use it in event handlers later
 if(card.parameter.hintTTS == '1' || card.parameter.hintTTS == '2')
   $('.hintbtn',html).on('click mouseover touchend',function(){ 
     AppClient.textToSpeech(card.parameter.hint); 
   });

 if(Math.random() > 0.5)
  $("#cards").prepend(card.htmlElement); else // add the card html Element to the #cards container
  $("#cards").append(card.htmlElement); 
 
 // make card draggable
 
  Draggable.create(card.htmlElement,{ type:"top,left", bounds:"#cards", autoScroll:1,
  onClick:     onCardClick,
  onDragStart: onCardDragStart,
  onDrag:      onCardDrag,
  onDragEnd:   onCardDragEnd
 });

 // make hint popover hoverable and touchable
 $('.popovers',card.htmlElement).popover({trigger:"hover"})
  .on('touchstart mousedown', function(e) {
     stopEvent(e);
     $(this).popover('toggle');
  });

 return card;
}

function changePosition(from, to, rowToUpdate) {

  var $tiles = $(".tile");
  var insert = from > to ? "insertBefore" : "insertAfter";

  // Change DOM positions
  $tiles.eq(from)[insert]($tiles.eq(to));

  layoutInvalidated(rowToUpdate);
}
///////////////////////////////////////////////////////////////////////////////
// card was clicked / touched
///////////////////////////////////////////////////////////////////////////////
function onCardClick(e){
 $("#usabilityHint").fadeOut();
 // card clicked, show lightbox if necessary 
 stopEvent(e);
  
 var card = $(this.target).data("card");

 // card is not clickable at the moment because tape between cards was clicked  
 if(card.htmlElement.hasClass("noclick")) return;

 // if the card has another card attached, bring it to front as well
 if(card.attached !== null) 
   Draggable.bringToFront([card.attached.htmlElement,card.htmlElement]);

 if(card.parameter.media == "text"){
    // text has no lightbox, do nothing
 }
     
 if(card.parameter.media == "image"){
  // only open lightbox, if image is twice as large as the card
  var img = new Image();
  img.src = card.parameter.value;
    
  if(img.width > card.htmlElement.width()*2 || img.height > card.htmlElement.height()*2){
   createModalDialogFrame('<div id="modalContentInner"></div>',
    function() {
     // on show
     $('#modalContentInner').html('<img data-dismiss="modal" class="img-responsive" '+
                                  'style="margin: 0 auto;" src="'+card.parameter.value+'" alt=""/>');
    }
   ).modal("show");
  }
 }  

 if(card.parameter.media == "speech"){
  createModalDialogFrame(card.innerHTML+'<div id="modalContentInner"></div>',
   function(){ 
    card.parameter.loadPlayer("modalContentInner",true); 
    $("#modalContentInner a").addClass("speechPlayBtn");
   }, function(){ AppClient.textToSpeechStop();}
  ).modal("show");
 }

 if(card.parameter.media == "audio"){
  createModalDialogFrame(card.innerHTML+'<div id="modalContentInner"></div>',
   function(){ card.parameter.loadPlayer("modalContentInner",true); }
  ).modal("show");
 }

 if(card.parameter.media == "video"){
  createModalDialogFrame(card.innerHTML+'<div id="modalContentInner"></div>',
   function(){
    $("#modalContentInner").height(
      Math.min($("#modalContentInner").width() / 4 * 3 +30,$(window).height()*0.8));
    card.parameter.loadPlayer("modalContentInner",true);
   }
  ).modal("show");
 }     
}
///////////////////////////////////////////////////////////////////////////////
// start card dragging
///////////////////////////////////////////////////////////////////////////////
function onCardDragStart(e){  
 $("#usabilityHint").fadeOut();
  
 var card = $(this.target).data("card");
 // make dragging card a bit transparent
 card.htmlElement.addClass("dragging");
 // hide hint popups if open 
 $('.popovers',card.htmlElement).popover("hide");
 $('.pin',card.htmlElement).hide();
}
///////////////////////////////////////////////////////////////////////////////
// moving card around the table
///////////////////////////////////////////////////////////////////////////////
function onCardDrag(e){
 var card = $(this.target).data("card");
 refreshCardPositionIndex(); 
}
///////////////////////////////////////////////////////////////////////////////
// dedect position of each card on the table and renumber them
///////////////////////////////////////////////////////////////////////////////
function refreshCardPositionIndex() {
 var positions = []; 
 for(var i=0; i < cardList.length; i++){ 
  var card = cardList[i].card;
  var p = card.htmlElement.offset(); 
  positions.push({card:card, w:card.htmlElement.outerWidth(), h:card.htmlElement.outerHeight(), x:p.left, y:p.top}); 
 } 
 // find new positions
 positions.sort(function(a,b){
  if(displayMode == "vertical"){
    if(a.y < b.y) return -1;
    if(a.y > b.y) return 1;
    return 0;
  }

  if(b.y >= a.y && b.y <= a.y + a.h){
    // overlapping card
    if(!(b.x+b.w/2 < a.x || b.x > a.x + a.w/2)){
      // over each other
      if(a.y < b.y) return -1;
      if(a.y > b.y) return 1;
      return 0;      
    }
  }
  if(a.y >= b.y && a.y <= b.y + b.h){
    // overlapping card
    if(!(a.x+a.w/2 < b.x || a.x > b.x + b.w/2)){
      // over each other
      if(a.y < b.y) return -1;
      if(a.y > b.y) return 1;
      return 0;      
    }
  }

  if(a.y < b.y-a.h) return -1;
  if(a.y > b.y+b.h) return 1;
   
  if(a.x < b.x) return -1;
  if(a.x > b.x) return 1;
  return 0;
 }); 
 
 function effect(card,newvalue){
  $('.num',card.htmlElement).css("color","#fff");
  setTimeout(function(){ $('.num',card.htmlElement).css("color","black"); $('.num',card.htmlElement).html(newvalue); },200);
 }
 
 for(var i=0; i < positions.length; i++){ 
  var card = positions[i].card;
  card.indexPosition = (i+1);  
  var old = $('.num',card.htmlElement).text();
  
  if(old != card.indexPosition) effect(card, card.indexPosition);
 }

 var d = 50;   
 for(var i=0; i < positions.length; i++){ 
  var c = positions[i].card;
       if(displayMode == "horizontal"){
         c.htmlElement.css("width","auto");
         c.htmlElement.css("top","20vh");
         if(!c.htmlElement.hasClass("dragging")) 
           c.htmlElement.animate({"left":d+"px"},{queue:false,duration:200,easing :"linear"});
         var ow = c.htmlElement.outerWidth();
         d += Math.round(ow + Math.max(24,ow*0.2));
       }
       if(displayMode == "vertical"){
         c.htmlElement.css("left","80px");
         if(!c.htmlElement.hasClass("dragging")) 
           c.htmlElement.animate({"top":d+"px"},{queue:false,duration:200,easing :"linear"});
         var oh = c.htmlElement.outerHeight();
         d += Math.round(oh + Math.max(24,oh*0.2));
       }
 }  
 if(displayMode == "vertical"){
   $('#cards').css("height",(d+100)+"px");
 }  
 if(displayMode == "horizontal"){
   $('#cards').css("width",(d+100)+"px");
 }  
}
///////////////////////////////////////////////////////////////////////////////
// card drag ended, attach cards if possible
///////////////////////////////////////////////////////////////////////////////
function onCardDragEnd(e){
 stopEvent(e);
  
 var card = $(this.target).data("card");
 card.htmlElement.removeClass("dragging");
 $('.pin',card.htmlElement).show();
 refreshCardPositionIndex();
 checkAppCompleted();
}
///////////////////////////////////////////////////////////////////////////////
// check if all elements are connected and inform upper frames via postmessage
///////////////////////////////////////////////////////////////////////////////
function checkAppCompleted () {
 // this app has all elements connected from the start, so trigger on first dragend
 AppClient.setCompleted();
}
///////////////////////////////////////////////////////////////////////////////
var lastWindowSizeW = -1;
var lastWindowSizeH = -1;
///////////////////////////////////////////////////////////////////////////////
// scale cards and position of cards when window size is changing
///////////////////////////////////////////////////////////////////////////////
function resizeWindow() {
 var w = $(window).width();
 var h = $(window).height();
 var m = Math.max(h,w);
 // font size of everything based on window size
 $("body").css({"font-size":Math.round(m/60)+"px"}); 
  
 $(".card").css({"width":(displayMode == "vertical" ? (w-180)+"px" : Math.round(m*0.175)+"px"), "padding":Math.round(m*0.01)+"px", "max-width":(displayMode == "vertical" ? (w-180)+"px" : Math.round(m*0.175)+"px"), "padding":Math.round(m*0.01)+"px"}); 
  
 $(".pin").css({"border-radius":Math.round(m/50)+"px",
                "width":Math.round(m/50)+"px",
                "height":Math.round(m/50)+"px",
                "top":-Math.round(m/50/1.5)+"px",
                "margin-left":-Math.round(m/50/2)+"px"});
 
 $(".card").each(function(){
  var card = $(this).data("card");
  var x = card.htmlElement.position().left;
  var y = card.htmlElement.position().top;
  if(lastWindowSizeW != -1 && lastWindowSizeH != -1){
   var cw = card.htmlElement.outerWidth();
   var ch = card.htmlElement.outerHeight();
   card.htmlElement.css("left",Math.round(Math.min(w-cw-5,(Math.round(w * x / lastWindowSizeW))))+"px");
   card.htmlElement.css("top" ,Math.round(Math.min(h-ch-5,(Math.round(h * y / lastWindowSizeH))))+"px");
  }
  var ow = card.htmlElement.outerWidth();
  $("img",card.htmlElement).css("max-height",Math.min(Math.round(h/2-m*0.03), Math.round(Math.min(ow*2, h/2-20)))+"px");
  $(".tape",card.htmlElement).css({"width":Math.round(ow*0.8)+"px",
                            "height":Math.round(ow*0.8 / 4)+"px",
                            "top":-Math.round(ow/6)+"px",
                            "margin-left":-Math.round(ow*0.8 / 2)+"px", 
                            "background-size":Math.round(ow*0.8)+"px"});
 });

 // after resize refit attached cards again 
 $(".card").each(function(){
   var card = $(this).data("card");
   doResizeText(card);
 });

 // remember current window size for next change
 lastWindowSizeW = w;
 lastWindowSizeH = h;
 refreshCardPositionIndex();
}
///////////////////////////////////////////////////////////////////////////////
function doResizeText(card){
  // resize card font size: 
  var resizeText = $('.resizeText', card.htmlElement);
  if(resizeText.length > 0){
    var fontSize = 1.2;
    resizeText.css('font-size', fontSize+"em");
    resizeText.css('line-height', "normal");
    var maxWidth = card.htmlElement.width()*1.1;
    var maxHeight = card.htmlElement.height()*1;
    var textWidth;
    var textHeight;
    fontSize = 1.0;
    do {
       resizeText.css('font-size', fontSize+"em");
       textHeight = resizeText.height();
       textWidth = resizeText.width();
       fontSize = fontSize - 0.1;
    } while ((textHeight > maxHeight || textWidth > maxWidth) && fontSize > 0.3);
  }
}
///////////////////////////////////////////////////////////////////////////////
function checkSolution(){
  var i,card;
  var wrong = 0;
  // remove card colors for new check
  for(i = 0; i < cardList.length; i++){
    cardList[i].card.htmlElement.removeClass("wrong correct");
  }
  
  // test if pairs are matching 
  var solutionOk = true;
  var checkResults = [];
  var order = [];

  for(i = 0; i < cardList.length; i++){
    cardList[i].card.isOK = false;
  }
  for(i = 0; i < cardList.length; i++){
    for(var z = 0; z < cardList[i].card.matchingCards.length; z++){
      if(cardList[i].card.matchingCards[z].indexPosition == i+1){
        cardList[i].card.matchingCards[z].isOK = true;
      }
    }    
  }

  
  for(i = 0; i < cardList.length; i++){
    var card = cardList[i].card; 
    if(card.isOK) {
       checkResults.push(1);
       card.htmlElement.addClass("correct");
    }else{
       checkResults.push(0);
       card.htmlElement.addClass("wrong");
       if(displayMode == "free") Draggable.bringToFront([card.htmlElement]);
       solutionOk = false;
       wrong++;
    }
  }
  
  AppClient.setChecked(checkResults);

  // tell LearningApps this app was solved
  if(solutionOk) AppClient.setSolved();
  
  // user found the correct solution? if feedback is not already displayed show it
  if(solutionOk)
    AppClient.showFeedbackPanel("feedback");
}

