(() => {
 'use strict';
 window.CINELIQ_CONTENT_TYPES={
  forItem(item){const record=window.CINELIQ_FULL_LEARNING?.records[item.id];return{
   image:record?record.imageApplicable:item.mediaType==='image',
   video:Boolean(record?.videoGuide||window.CINELIQ_LEARNING?.[item.id]?.videoPromptExample||item.mediaType==='video'),
  };},
  matches(item,selected){if(!selected.size)return true;const kinds=this.forItem(item);return[...selected].some(kind=>kinds[kind]);},
 };
})();
