import EventEmitter from 'node:events';












export class SharedPubSubBroker {constructor() { SharedPubSubBroker.prototype.__init.call(this); }
  
   __init() {this.emitter = new EventEmitter()}

   static getInstance() {
    if (!SharedPubSubBroker.instance) {
      SharedPubSubBroker.instance = new SharedPubSubBroker();
    }
    return SharedPubSubBroker.instance;
  }

   async publishRecommendation(rec) {
    const fullMsg = {
      ...rec,
      timestamp: new Date().toISOString(),
    };
    this.emitter.emit('ai.recommendations', fullMsg);
    return `rec-event-${Date.now()}`;
  }

   onRecommendation(listener) {
    this.emitter.on('ai.recommendations', listener);
    return () => {
      this.emitter.off('ai.recommendations', listener);
    };
  }
}

export const sharedPubSub = SharedPubSubBroker.getInstance();
