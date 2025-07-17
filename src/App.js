import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import audioIconImg from './assets/audio.png';
import sendIconImg from './assets/sent.png';
import chat from './assets/chat.png';



// --- UI Components (Largely Unchanged) ---

const Header = () => (
  <header className="app-header">
    <div className="logo-container">
      {/* <svg className="logo-svg" viewBox="0 0 24 24" fill="">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15.59L7.41 14l1.41-1.41L11 14.17l4.59-4.59L17 11l-6 6z"></path>
      </svg> */}
      <h1>AI Coach</h1>
    </div>
  </header>
);

// --- UPDATED MessageBubble Component ---
const MessageBubble = ({ msg, userDetails }) => {
    const botAvatar = (
        <div className="avatar bot-avatar">
            <svg viewBox="0 0 24 24" fill="currentColor">
                 <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15.59L7.41 14l1.41-1.41L11 14.17l4.59-4.59L17 11l-6 6z"></path>
            </svg>
        </div>
    );
    
    // UPDATED: Get the user's initial dynamically
    const userInitial = userDetails?.userName ? userDetails.userName.charAt(0).toUpperCase() : 'U';
    const userAvatar = <div className="avatar user-avatar">{userInitial}</div>;

    return (
        <div className={`message-container ${msg.sender}`}>
            {msg.sender === 'bot' ? botAvatar : userAvatar}
            <div className={`message-bubble ${msg.sender}`}>
                {msg.isLoading ? <TypingIndicator /> : <ReactMarkdown>{msg.text}</ReactMarkdown>}
            </div>
        </div>
    );
};



const TypingIndicator = () => (
    <div className="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
    </div>
);

const QuickReplies = ({ replies, onQuickReply }) => (
  <div className="quick-replies-container">
    {replies.map((reply, index) => (
      <button key={index} onClick={() => onQuickReply(reply.payload)} className="quick-reply-button">
        {reply.title}
      </button>
    ))}
  </div>
);

const MessageInput = ({ userInput, setUserInput, handleSendMessage, isLoading, onVoiceModeClick }) => {
  // --- State and Effect for the Tooltip ---
  const [showVoiceTooltip, setShowVoiceTooltip] = useState(true);

  useEffect(() => {
    // Set a timer to hide the tooltip after 5 seconds
    const timer = setTimeout(() => {
      setShowVoiceTooltip(false);
    }, 5000);

    // Clean up the timer if the component unmounts
    return () => clearTimeout(timer);
  }, []); // The empty array ensures this effect runs only once

  const sendIcon = <img src={sendIconImg} alt="Send" />;
  const voiceIcon = <img src={audioIconImg} alt="Voice Mode" />;

  return (
    <footer className="app-footer">
      <form onSubmit={handleSendMessage} className="message-form">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Ask your health coach..."
          disabled={isLoading}
        />
        
        {/* NEW: Wrapper for the button and its tooltip */}
        <div className="voice-button-container">
          {showVoiceTooltip && (
            <div className="voice-tooltip">
              click here for voice mode
            </div>
          )}
          <button
            type="button" 
            onClick={onVoiceModeClick}
            disabled={isLoading}
            className="voice-button"
          >
              {voiceIcon}
          </button>
        </div>

        <button type="submit" disabled={isLoading || !userInput.trim()}>
          {isLoading ? <div className="spinner"></div> : sendIcon}
        </button>
      </form>
    </footer>
  );
};

// --- New Component for the Voice App Overlay ---
const VoiceModeOverlay = ({ isOpen, onClose, url }) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="voice-overlay">
      <div className="voice-overlay-header">
        {/* <h3>AI Coach</h3>  */}
        {/* UPDATED: Button now uses the chat icon */}
        <button onClick={onClose} className="voice-overlay-close-button">
          <img src={chat} alt="Back to Chat" width="24" height="24" />
        </button>
      </div>
      <div className="voice-overlay-content">
        <iframe
          src={url}
          title="GOQii AI Coach Voice Mode"
          allow="microphone; camera"
          style={{ width: '100%', height: '100%', border: 'none' }}
        />
      </div>
    </div>
  );
};

// --- Main App Component ---
export default function App() {
  const [messages, setMessages] = useState([]);
  const [chatHistory, setChatHistory] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [quickReplies, setQuickReplies] = useState([]);
  const [userDetails, setUserDetails] = useState([]);
  // State to hold the fetched health data
  const [healthData, setHealthData] = useState(null);

  // New state for managing the voice mode overlay
  const [isVoiceModeOpen, setIsVoiceModeOpen] = useState(false); 
  
  const messagesEndRef = useRef(null);
  const apiKey = "AIzaSyAthZyWc6JKlKu9r9a_bxcRu3IJtv7dxms"; // IMPORTANT: Replace with your actual API key

  const getCommonHeaders = () => {
  return {
        "Content-Type": "application/json",
        "h-goqiiuserid": userDetails.goqiiUserId.toString(),
        "h-nonce": userDetails.nonce,
        "h-signature": userDetails.signature,
        "h-apikey": userDetails.apiKey,
        "h-goqiiaccesstoken": userDetails.goqiiAccessToken,
        "h-appversion": userDetails.appVersion.toString(),
        "h-apptype": userDetails.appType,
    };
  }

      // Function to handle opening the voice mode
  const handleVoiceModeToggle = () => {
    if (userDetails && userDetails.goqiiUserId) {
      setIsVoiceModeOpen(true); // Just set the state to true
    } else {
      console.error("Cannot open voice mode: userDetails or goqiiUserId is missing.");
      alert("Could not start voice mode. User information is not available.");
    }
  };

  // URL for the voice app
  const voiceAppUrl = useMemo(() => {
    if (userDetails && userDetails.goqiiUserId) {
      return `https://livekit-frontend-mnlx.vercel.app/?goqiiUserId=${userDetails.goqiiUserId}`;
    }
    return '';
  }, [userDetails]);
  
   async function addWaterEntry(amount, unit) {
  const url = "https://apiv7.goqii.com/water/add_water";
console.log("getCommonHeaders(), ",getCommonHeaders())
  // Normalize to milliliters
  let amountInMl = unit === "l" || unit.includes("litre") ? amount * 1000 : amount;
  amountInMl = Math.round(amountInMl); // Ensure it's an integer

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toTimeString().split(" ")[0];



  const payload = {
    data: JSON.stringify([
      {
        serverWaterId: "0",
        quantity: "0",
        unit: "ML",
        status: "new",
        localWaterId: `${Date.now()}`, // unique ID
        source: "goqii",
        date: dateStr,
        amountInMl: amountInMl,
        createdTime: `${dateStr} ${timeStr}`
      }
    ])
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: getCommonHeaders(),
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log("✅ Water Add Response:", result);
  } catch (error) {
    console.error("❌ API call failed:", error);
  }
}

 async function addWeightEntry(weightKg) {
  const url = "https://apiv7.goqii.com/weight/add_weight";

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toTimeString().split(" ")[0];


  const payload = [
    {
      weight: weightKg.toFixed(6),
      source: "goqii",
      moisture: "0",
      weightUnit: "KG",
      serverWeightId: "-1",
      status: "new",
      visceralFat: "0",
      waist: "0.000000",
      bodyFat: "0",
      resistance: "0",
      createdTime: `${dateStr} ${timeStr}`,
      date: dateStr,
      bmr: "0",
      bmi: "0",
      protein: "0",
      skeletalMuscle: "0",
      localWeightId: `${Date.now()}`,
      bone: "0",
      targetWeight: "0",
      boneMuscle: "0",
      hip: "0"
    }
  ];

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: getCommonHeaders(),
      body: JSON.stringify({ data: JSON.stringify(payload) })
    });

    const result = await response.json();
    console.log("✅ Weight Add Response:", result);
  } catch (error) {
    console.error("❌ API call failed:", error);
  }
}

 async function addSleepEntry(duration) {
  const url = "https://apiv7.goqii.com/sleep/add_sleep";

  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  const timeStr = now.toTimeString().split(" ")[0];
  const sleepStart = new Date(now.getTime() - duration * 60000); // duration minutes ago
  const sleptDate = sleepStart.toISOString().split("T")[0];
  const sleptTime = sleepStart.toTimeString().split(" ")[0];

  const payload = [
    {
      rating: 4,
      logType: "",
      createdTime: `${dateStr} ${timeStr}`,
      localSleepId: Date.now(),
      awakeTime: `${dateStr} ${timeStr}`,
      source: "",
      date: sleptDate,
      minutesAsleep: "0",
      timeInBed: "0",
      serverSleepId: "0",
      duration: duration,
      status: "new",
      sleptTime: `${sleptDate} ${sleptTime}`
    }
  ];

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: getCommonHeaders(),
      body: JSON.stringify({ data: JSON.stringify(payload) })
    });

    const result = await response.json();
    console.log("✅ Sleep Add Response:", result);
  } catch (error) {
    console.error("❌ Sleep API call failed:", error);
  }
}

 async function addActivityEntry(activityName, durationMin, intensity) {
  console.log("Logging Activities with info", activityName, durationMin, intensity)
  const url = "https://apiv7.goqii.com/activity/add_multiple_activity";
 
  const end = new Date();
  const start = new Date(end.getTime() - durationMin * 60000);
  
  const dateStr = end.toISOString().split("T")[0];
  const startTime = start.toTimeString().split(" ")[0];
  const endTime = end.toTimeString().split(" ")[0];

  const payload = [
    {
      activityTypeName: activityName,
      activityText: "",
      source: "goqii",
      status: "new",
      duration: durationMin.toString(),
      durationSec: (durationMin * 60).toString(),
      logFrom: "manual",
      pointData: "",
      derivedJson: "",
      calories: "", // Optionally calculate or leave blank
      intensity: intensity,
      simplifiedData: "",
      serverActivityId: "1",
      endTime: endTime,
      startTime: startTime,
      createdTime: `${dateStr} ${endTime}`,
      date: dateStr,
      localActivityId: `${Date.now()}`,
      distance: "0.00",
      heartData: "",
      unit: "",
      imageJson: "",
      gpsJson: "",
      imageWidth: "",
      heightAspectRatio: "",
      activityImageUrl: "",
      steps: "",
      activityImage: "",
      description: "",
      jsonData: ""
    }
  ];

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: getCommonHeaders(),
      body: JSON.stringify({ data: JSON.stringify(payload) })
    });

    const result = await response.json();
    console.log("✅ Activity Add Response:", result);
  } catch (error) {
    console.error("❌ Activity API call failed:", error);
  }
}

 async function addFoodEntry(foodName, mealType) {
  console.log("Logging Food with info:", foodName, mealType);
  const url = "https://apiv7.goqii.com/food/add_food_v2";
  
  // compute timestamps
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];           // YYYY-MM-DD
  const timeStr = now.toTimeString().split(" ")[0];           // HH:MM:SS
  const createdTime = `${dateStr} ${timeStr}`;                // e.g. "2025-05-09 14:30:15"

  // build the payload array—with defaults for everything except name/type
  const payload = [
    {
      recognition: "0",
      unit: "",                       // leave blank or supply if you know
      createdTime,
      calories: "0",                  // leave "0" or compute if you have
      goqiiUserId: userDetails.goqiiUserId,  // replace with actual user ID
      amount: "0",                    // default; supply if you know grams/servings
      foodImageUrl: "",
      localFoodId: `${Date.now()}`,   // unique per‐entry
      foodImage: "",
      source: "goqii",
      healthAnalysis: {
        healthMeter: "5",              // e.g. "5"
        portionCategory: "Medium",          // e.g. "Medium"
        portionSize: "1",              // e.g. "1"
        healthMeterCategory: "Medium",      // e.g. "Medium"
        foodType: "Home"                  // e.g. "Home" or "Restaurant"
      },
      date: dateStr,
      foodName:foodName,
      mealType:mealType,
      times: timeStr,
      serverFoodId: "0",
      status: "new"                   // or "inprogress" per your flow
    }
  ];

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: getCommonHeaders(),             // your existing header helper
      body: JSON.stringify({ data: JSON.stringify(payload) })
    });

    const result = await response.json();
    console.log("✅ Food Add Response:", result);
    return result;
  } catch (error) {
    console.error("❌ Food API call failed:", error);
    throw error;
  }
}

 async function sendUserConversationEncrypted(message,coachId) {
  if(coachId == ""){
    return
  }
  const url = "https://apiv7.goqii.com/userchatconversation/send_user_conversation";
  let timeStamp = Date.now()
  let chatData = [
      {
        "imageUrl" : "",
        "message" : message,
        "messageTimestamp" :  Date.now().toString()
      }
    ];      
    console.log(chatData);
  // Hard-coded encrypted payload from your example
  const body = {
      goqiiCoachId:coachId,
      chatData: JSON.stringify(chatData)
  }
 

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: getCommonHeaders(),
      body: JSON.stringify(body)
    });

    const result = await response.json();
    console.log("✅ send_user_conversation response:", result);
    return result;
  } catch (error) {
    console.error("❌ send_user_conversation failed:", error);
    throw error;
  }
}


 async function coachCallSelectedSlot() {
   
  const params =  {
    goqiiCoachId:   userDetails.goqiiCoachId,
    goqiiuserid:     userDetails.goqiiUserId,
    apikey:         apiKey,
    goqiiaccesstoken:userDetails.goqiiAccessToken,
    appversion:     userDetails.appVersion,
    apptype:        userDetails.appType
  }
  
    // 2. Base64-encode the JSON payload
    const json = JSON.stringify(params);
    const data = btoa(json); // in Node.js: Buffer.from(json).toString('base64')

  
    // 4. Send the POST
    const response = await fetch(
      "https://apiv7.goqii.com/user/coach_call_selected_slot",
      {
        method:  "POST",
        headers: getCommonHeaders(),
        body: JSON.stringify({ data })
      }
    );
  
    const result = await response.json();
    console.log("✅ coach slot response:", result);
  
    // 5. Return parsed JSON
    return result;
  }


   async function fetchDoctorAppointmentSlot() {

  const params =  {
    "type":"",
    "queryDate":"2025-05-13",
    "memberId":""
  }
 
 

    // 4. Send the POST
    const response = await fetch(
      "https://apiv7.goqii.com/user/fetch_doctor_appointment_slots",
      {
        method:  "POST",
        headers: getCommonHeaders(),
        body: JSON.stringify(params)
      }
    );
  
    const result = await response.json();
    console.log("✅ Doctor slot response:", result);
  
    // 5. Return parsed JSON
    return result;
  }
  

  async function scheduleCoachAppointment(appointmentSlot, appointmentDate) {
  if( userDetails.goqiiCoachId == ""){
    return
  }
    console.log("▶️  Scheduling coach appointment:", { appointmentSlot, appointmentDate });
  
    const url = "https://apiv7.goqii.com/user/schedule_coach_appointment";
    const slotEncoded = encodeURIComponent(appointmentSlot);
  
    // build the exact payload keys the API wants
    const payload = {
      selectedSlot:      "1",            // or pass this in as a parameter
      appointmentSlot:   slotEncoded,    // "09:30%20pm"
      goqiiuserid:       userDetails.goqiiUserId,    // your var, e.g. "116563"
      callType:          "review",
      goqiiCoachId:      userDetails.goqiiCoachId,   // your var, e.g. "41036"
      apikey:            apiKey,         // "whshf1wjy88ayld1h2ba6jqay2gay854"
      apptype:           userDetails.appType,        // "ios"
      appointmentDate: appointmentDate,                   // "2025-05-13"
      goqiiaccesstoken:  userDetails.goqiiAccessToken,
      appversion:        userDetails.appVersion      // "274"
    };
  
    console.log("📤 payload:", payload);
  
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getCommonHeaders()     // your h- headers (token, signature, etc.)
        },
        body: JSON.stringify(payload) 
      });
  
      const result = await response.json();
      console.log("✅ schedule_coach_appointment response:", response.status, result);
      return result;
    } catch (err) {
      console.error("❌ schedule_coach_appointment failed:", err);
      throw err;
    }
  }


   async function scheduleDoctorAppointment(time,date) {


   const params = {"appointmentDate":date,"appointmentReason":"General","appointmentTime":time,"memberId":"","type":""}
   
   
  
      // 4. Send the POST
      const response = await fetch(
        "https://apiv7.goqii.com/user/save_doctor_appointment",
        {
          method:  "POST",
          headers: getCommonHeaders(),
          body: JSON.stringify(params)
        }
      );
    
      const result = await response.json();
      console.log("✅ Doctor appointment Booking response:", result);
    
      // 5. Return parsed JSON
      return result
      
      
    }


    async function addGlucoseEntry( level) {
      console.log("▶️  Adding glucose entry:", {  level });
    
      // 1) build current datetime strings
      const now     = new Date();
      const dateStr = now.toISOString().split("T")[0];            // "YYYY-MM-DD"
      const timeStr = now.toTimeString().split(" ")[0];           // "HH:MM:SS"
      const logDate = `${dateStr} ${timeStr}`;                    // e.g. "2025-05-13 14:45:30"
      const localId = Date.now().toString();                      // unique per-entry
    
      // 2) build the single-record array
      const record = {
        vitalType:  "1",
        mealType: "1",  //mealType.toString(),
        localId:localId,
        level: level.toString(),
        serverId:   "0",
        logDate,
        metric:     "1",
        type:       "2",
        subType:    "0",
        logType:    "1",
        status:     "new"
      };
    
      // 3) assemble full payload
      const payload = {
        apptype:          userDetails.appType,
        goqiiaccesstoken:  userDetails.goqiiAccessToken,
        appversion:     userDetails.appVersion,
        apikey:         apiKey,
        goqiiuserid:      userDetails.goqiiUserId ,
        data:    JSON.stringify([record])
      };
    
      // 4) POST to the endpoint
      try {
        const response = await fetch("https://apiv7.goqii.com/glucose/add_glucose", {
          method: "POST",
          headers: getCommonHeaders(),
          body: JSON.stringify(payload)
        });
    
        const result = await response.json();
        console.log("✅ add_glucose response:", response.status, result);
        return result;
      } catch (error) {
        console.error("❌ add_glucose failed:", error);
        throw error;
      }
    }
    
     async function fetchMyOrders() {
      console.log("▶️  Fetching orders");
    
      const url = "https://apiv7.goqii.com/store/fetch_my_orders_v2";
    
      // include pageId in the POST body
      const payload = { pageId: "1" };
    
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: getCommonHeaders(),   // your h- headers, tokens, etc.
         
          body: JSON.stringify(payload)
        });
    
        const result = await response.json();
        console.log("✅ fetch_my_orders_v2 response:", response.status, result);
        return result;
      } catch (err) {
        console.error("❌ fetch_my_orders_v2 failed:", err);
        throw err;
      }
    }






// --- Mock API Functions ---
const fetchUserDetails = async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const goqiiUserId = urlParams.get("goqiiUserId") || urlParams.get("goqiiuserid");
    const USER_API_URL = `https://apiv4.goqii.com/user/find_user_by_phone?goqiiUserId=${goqiiUserId}&identifier=TEST`;
    try {
        const response = await fetch(USER_API_URL);
        if (!response.ok) throw new Error(`HTTP error fetching user details! status: ${response.status}`);
        const data = await response.json();
        return data.data;
    } catch (error) {
        console.error("Error fetching user details:", error);
        return null;
    }
};



const fetch7DayFoodData = async (userDetails) => {
    if (!userDetails) {
        console.error("Cannot fetch food data without user details.");
        return null;
    }
    const BASE_URL = "https://apiv4.goqii.com/";
    const HEADERS = {
        "Content-Type": "application/json",
        "h-goqiiuserid": userDetails.goqiiUserId.toString(),
        "h-nonce": userDetails.nonce,
        "h-signature": userDetails.signature,
        "h-apikey": userDetails.apiKey,
        "h-goqiiaccesstoken": userDetails.goqiiAccessToken,
        "h-appversion": userDetails.appVersion.toString(),
        "h-apptype": userDetails.appType,
    };
    try {
        const body = { "goqiiUserId": userDetails.goqiiUserId.toString(), "days": "10" };
        const response = await fetch(BASE_URL + "user/fetch_users_health_data", {
            method: 'POST',
            headers: HEADERS,
            body: JSON.stringify(body),
        });
        if (!response.ok) throw new Error(`HTTP error fetching food data! status: ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error("Error fetching 7-day food data:", error);
        return null;
    }
};


  // --- Client-Side Tool Implementation ---
  const getHealthSummary = async ({ day }) => {
      console.log(`🛠️ Tool called: getHealthSummary for '${day}'`);
      if (!healthData || !healthData.data) {
          return { success: false, error: "Health data not loaded yet." };
      }
      const today = new Date();
      let targetDate;
      if (day === 'today') {
          targetDate = today.toISOString().split('T')[0];
      } else if (day === 'yesterday') {
          const yesterday = new Date(today);
          yesterday.setDate(today.getDate() - 1);
          targetDate = yesterday.toISOString().split('T')[0];
      } else {
          return { success: false, error: "Invalid day specified. Use 'today' or 'yesterday'." };
      }
      const summary = {
        date: targetDate,
        foodLogs: healthData.data.food.filter(log => log.loggedDate.startsWith(targetDate)),
        waterLogs: healthData.data.water.filter(log => log.loggedDate.startsWith(targetDate)),
        sleepLogs: healthData.data.sleep.filter(log => log.loggedDate.startsWith(targetDate)),
      };
      console.log("📊 Generated Summary:", summary);
      return { success: true, summary: summary };
  };

  const logWater = async ({ amount }) => {
    console.log(`💧 Tool called: log_water with amount: ${amount}`);
     addWaterEntry(amount,"ml")
      return { success: true, message: `Successfully logged ${amount} of water.` };
  };

  const logWeight = async ({ weight }) => {
      console.log(`⚖️ Tool called: log_weight with weight: ${weight}kg`);
      addWeightEntry(weight)
      return { success: true, message: `Successfully logged weight as ${weight} kg.` };
  };

  const logSleep = async ({ duration }) => {
      console.log(`😴 Tool called: log_sleep with duration: ${duration} minutes`);
      const hours = Math.floor(duration / 60);
      const minutes = duration % 60;
      addSleepEntry(duration)
      return { success: true, message: `Successfully logged ${hours}h ${minutes}m of sleep.` };
  };

  const logActivity = async ({ activity_name, duration, intensity }) => {
      console.log(`🏃 Tool called: log_activity: ${activity_name}, ${duration} mins, ${intensity || 'N/A'} intensity`);
      addActivityEntry(activity_name, duration, intensity)
      return { success: true, message: `Successfully logged ${duration} minutes of ${activity_name}.` };
  };

  const logFood = async ({ food_name, meal_type, amount }) => {
      console.log(`🍲 Tool called: log_food: ${food_name}, Meal: ${meal_type}, Amount: ${amount || 'N/A'}`);
      addFoodEntry(food_name, meal_type, amount )
      return { success: true, message: `Successfully logged ${food_name} for ${meal_type}.` };
  };

  const scheduleCoachCall = async ({ date, time }) => {
      console.log(`📅 Tool called: schedule_coach_call for ${date} at ${time}`);
      return { success: true, message: `Your coach call has been scheduled for ${date} at ${time}.` };
  };

  const scheduleDoctorCall = async ({ date, time }) => {
      console.log(`🩺 Tool called: schedule_doctor_call for ${date} at ${time}`);
      scheduleCoachAppointment(date, time)
      return { success: true, message: `Your doctor's appointment is confirmed for ${date} at ${time}.` };
  };

  const messageCoach = async ({ message }) => {
      console.log(`💬 Tool called: message_coach with message: "${message}"`);
      sendUserConversationEncrypted(message)
      return { success: true, message: `Your message has been sent to the coach.` };
  };

  const logGlucose = async ({ level }) => {
      addGlucoseEntry(level)
      console.log(`🩸 Tool called: log_glucose with level: ${level}`);
      return { success: true, message: `Successfully logged glucose level of ${level} mmol/L.` };
  };

  const availableTools = {
      get_health_summary: getHealthSummary,
      log_water: logWater,
      log_weight: logWeight,
      log_sleep: logSleep,
      log_activity: logActivity,
      log_food: logFood,
      schedule_coach_call: scheduleCoachCall,
      schedule_doctor_call: scheduleDoctorCall,
      message_coach: messageCoach,
      log_glucose: logGlucose,
  };

  // --- Tool and System Prompt Definitions using useMemo ---
  const tools = useMemo(() => ({
      functionDeclarations: [
          {
              name: "get_health_summary",
              description: "Gets a structured summary of the user's logged health data for a specific day.",
              parameters: {
                  type: "OBJECT",
                  properties: { day: { type: "STRING", description: "The day to summarize: 'today' or 'yesterday'." } },
                  required: ["day"],
              },
          },
          {
            name: "log_water",
            description: "Logs the amount of water the user has consumed.",
            parameters: {
                type: "OBJECT",
                properties: { amount: { type: "STRING", description: "The amount of water, e.g., '250ml'." } },
                required: ["amount"],
            },
          },
          {
            name: "log_weight",
            description: "Logs the user's current weight.",
            parameters: {
                type: "OBJECT",
                properties: { weight: { type: "NUMBER", description: "Weight in kilograms." } },
                required: ["weight"],
            },
          },
          {
            name: "log_sleep",
            description: "Logs sleep duration.",
            parameters: {
                type: "OBJECT",
                properties: { duration: { type: "NUMBER", description: "Total sleep duration in minutes." } },
                required: ["duration"],
            },
          },
          {
            name: "log_activity",
            description: "Logs a physical activity.",
            parameters: {
                type: "OBJECT",
                properties: {
                    activity_name: { type: "STRING", description: "Name of the activity, e.g., 'Running'." },
                    duration: { type: "NUMBER", description: "Duration in minutes." },
                    intensity: { type: "STRING", description: "Intensity: 'easy', 'moderate', or 'hard'." },
                },
                required: ["activity_name", "duration"],
            },
          },
          {
            name: "log_food",
            description: "Logs a food item.",
            parameters: {
                type: "OBJECT",
                properties: {
                    food_name: { type: "STRING", description: "Name of the food, e.g., 'Chicken Salad'." },
                    meal_type: { type: "STRING", description: "e.g., 'Breakfast', 'Lunch', 'Dinner', 'Snack'." },
                    amount: { type: "STRING", description: "Portion size, e.g., '1 bowl'." },
                },
                required: ["food_name", "meal_type"],
            },
          },
          {
            name: "schedule_coach_call",
            description: "Schedules a coaching session.",
            parameters: {
                type: "OBJECT",
                properties: {
                    date: { type: "STRING", description: "Date in YYYY-MM-DD format." },
                    time: { type: "STRING", description: "Time in 24-hour HH:MM format." },
                },
                required: ["date", "time"],
            },
          },
          {
            name: "schedule_doctor_call",
            description: "Schedules a doctor's appointment.",
            parameters: {
                type: "OBJECT",
                properties: {
                    date: { type: "STRING", description: "Date in YYYY-MM-DD format." },
                    time: { type: "STRING", description: "Time in 24-hour HH:MM format." },
                },
                required: ["date", "time"],
            },
          },
          {
            name: "message_coach",
            description: "Sends a text message to the coach.",
            parameters: {
                type: "OBJECT",
                properties: { message: { type: "STRING", description: "The message content." } },
                required: ["message"],
            },
          },
          {
            name: "log_glucose",
            description: "Logs a blood glucose reading.",
            parameters: {
                type: "OBJECT",
                properties: { level: { type: "NUMBER", description: "The blood glucose level." } },
                required: ["level"],
            },
          },
      ]
  }), []);

  const getSystemPrompt = (fullHealthData, userDetails,currentTimeString ) => {
    // This function encapsulates your detailed prompt logic
    return {
      role: "user",
      parts: [{
    text: `You are "Health Coach," an elite, holistic AI health and fitness coach for ${userDetails.userName || ''}. Your mission is to provide expert, data-driven, and hyper-personalized guidance. You MUST operate exclusively on the data provided below.
        - **Current Date and Time:** find out based on users region which is ${userDetails.region || ''} don,t miss this calculate this accurately.always keep that in mind while communicating and giving greeting message.Always say good morning or afternoon based on current time in the region.
            Upto 12 am it's a morning  time and breakfast preffered time, after 12 am to 4 pm it's a afternoon time and lunch preffered time,after 4 pm to 6 pm it's a evening time and snaks preffered time,after 6 pm to 12 pm it's a evenining-night time and dinner preffered time.Follow this everywhere in conversation.Based on users current time.
      ###Responce Format -
      Responce should be higly accurate ,conversational and natural.It should ne based on users data,his location and date time,also i should not be greater than 50 words strictlyss,only user ask any detail info then it wil go upto 80 words.Responce should be always breif upto the mark, and always include all key data points.
      Also ai coach should always open to answer all users qurries intelligently useing health fitness and nutrition knowledge and resources. it should never say user to go for expert doctor or human coach it should act like expert coach,doctor and nutritionist based onhi knowledge.
      At the end of every responce caoch should keep conversation open ended and ask user some questions or tell or suggest user to do some things so that way conversation will increase users engyuagement.While doing this keep users time and cureent data in mind wile suggestions ,verify in waht time user is in.Upto 12 am it's a morning  time and breakfast preffered time, after 12 am to 4 pm it's a afternoon time and lunch preffered time,after 4 pm to 6 pm it's a evening time and snaks preffered time,after 6 pm to 12 pm it's a evenining-night time and dinner preffered time.Follow this everywhere in conversation.Based on users current time.
      ### Current Context & Data Mandate
      - **Current Date and Time:** Users Current Date and Time ${currentTimeString} ,Don't miss this use this accurately.Always keep that in mind while communicating and giving greeting message.
      - **Data Access Mandate:** The user's data in the JSON below is **complete and up-to-date**. You **MUST** find and analyze the logs for today's date and yesterday's date within this data. **NEVER** claim you cannot access recent data or that it is missing. Your primary task is to analyze what is present.
      - users age = ${userDetails.age || ''} 
      - users height = ${userDetails.height || ''} 
      - users weight = ${userDetails.weight || ''} 

      ### Your Persona:
      - **Expert & Scientific:** You base your advice on established health principles and the user's specific data.
      - **Holistic & Observant:** You are a master at connecting data points, linking sleep to food choices, activity to energy, and daily actions to long-term progress.
      - **Proactive & Engaging:** You anticipate needs and initiate conversations with a dynamic, context-aware daily check-in.
      - **Motivational & Empathetic:** You celebrate wins and provide constructive, forward-looking support during challenges.

      ### Advanced Coaching Intelligence:
      1.  **Pattern Recognition for Preferences:** You **must** analyze historical data to learn the user's food and workout preferences and use this knowledge in your suggestions.
      2.  **Hyper-Contextual Awareness:** Your advice **MUST ALWAYS** be relevant to the user's current local time, date, and location.

      ### Core Directives & Rules of Engagement:
      1.  **Analyze Holistically:** ALWAYS synthesize information from all available health data fields.
      2.  **Constant Goal & Data Alignment:** Constantly reference the user's current \`profile.goals\` and \`profile.habits\`.
      3.  **Deeper Personalization:** You **MUST** use the user's \`age\`, \`height\`, \`weight\`, and \`gender\` to inform calorie and activity recommendations.
      4.  **Handle Incomplete Food Data:** If a food log is missing nutritional data, you **MUST** estimate the values. **Never** state that data is missing.
      5.  **Be Specific & Actionable:** All advice must be a concrete, actionable step.

      ### Key Coaching Scenarios & Your Role:

      * **A. Initial Engagement & Daily Check-in (Your First Action):**
          * At the very start of the conversation, you **MUST begin** with a brief, proactive **"Daily Check-in."**
          * first analyse users data correctly with date and time.Based on current date and data available for diff dates decide on what day user did what log.
          * This briefing must be concise (under 70 words) and structured precisely as follows:
              1.  **Time-Appropriate Welcome:** Start with a greeting based on the current time (e.g., "Good afternoon, Alex!").
              2.  **Progress Snapshot:** Give a quick summary of their weight vs. their target weight.
              3.  **Yesterday's Recap & Habit Check:** Provide a one-sentence analysis of yesterday's performance and mention one habit that was missed.
              4.  **Today's Log Analysis:** Find the logs for the **current date** in the JSON data. Give a 1-2 sentence review of what they have logged so far today. If nothing is logged, state that.
              5.  **Daily Reminder & Tip:** Provide a time-sensitive reminder (e.g., "Since it's the afternoon, it's a great time to focus on hydration.") and an actionable tip for the rest of the day.

      * **B. When a user asks for a plan (Meal or Workout):**
          * First, check the user's logs for the current day to see what they have already eaten or what activities they have already done.Dont give exactly seme food items suggest related items available in users region keep variety ,taste and users interest in mind.Always suggest home cooked ,healthy meals dont suggest fast foods or outside foods.
          * Then, generate a detailed plan that is **explicitly based on their inferred preferences** and accounts for their activity/food logs so far today.

      * **C. When a user misses a target:**
          * Be empathetic. Provide a simple, concrete plan to get back on track *today*.

      ### User Data for Analysis:

      \`\`\`json
      ${JSON.stringify(fullHealthData, null, 2)}
      \`\`\`

      Now, armed with this persona, advanced intelligence, and all directives, begin your coaching. **Start IMMEDIATELY by delivering the "Initial Engagement & Daily Check-in" as described in your scenarios.**`
      }]
    };
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  // --- Revamped Initialization ---
  useEffect(() => {
    const initialize = async () => {
      setMessages([{ sender: 'bot', text: 'Connecting to your health coach...', isLoading: true }]);

      const userDetails = await fetchUserDetails();
      setUserDetails(userDetails)
      console.log("userDetails ",userDetails);
      if (!userDetails) {
        setMessages([{ sender: 'bot', text: 'Could not fetch user details. Please try again.', isLoading: false }]);
        setIsLoading(false);
        return;
      }

      const fetchedHealthData = await fetch7DayFoodData(userDetails);
      setHealthData(fetchedHealthData);
// You need to define currentTimeString again
const now = new Date();
      const options = {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          timeZone: 'Asia/Kolkata', // Timezone for India
          timeZoneName: 'short'
      };
      const currentTimeString = new Intl.DateTimeFormat('en-IN', options).format(now);

// Now, call the function with all three arguments
const systemPrompt = getSystemPrompt(fetchedHealthData, userDetails, currentTimeString); 
      // const systemPrompt = getSystemPrompt(userDetails);
      const initialHistory = [systemPrompt];
      setChatHistory(initialHistory);
      
      await handleGeminiResponse(initialHistory);
    };

    initialize();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Core Function for Handling Gemini Streaming and Tool Calls ---
  const handleGeminiResponse = async (historyForAPI) => {
      setIsLoading(true);
      setQuickReplies([]);
  
      setMessages(prev => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.sender === 'bot' && lastMsg.isLoading) {
              return prev;
          }
          return [...prev, { sender: 'bot', text: '', isLoading: true }];
      });
  
      const payload = { contents: historyForAPI, tools: tools };
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:streamGenerateContent?alt=sse&key=${apiKey}`;
  
      const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });
  
      if (!response.ok) {
          throw new Error(`API call failed with status: ${response.status}`);
      }
  
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullBotResponse = '';
      let detectedFunctionCalls = [];
  
      while (true) {
          const { done, value } = await reader.read();
          if (done) break;
  
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
  
          for (const line of lines) {
              if (line.trim().startsWith('data:')) {
                  const jsonString = line.substring(5).trim();
                  if (jsonString === '[DONE]') break;
                  try {
                      const json = JSON.parse(jsonString);
                      const parts = json?.candidates?.[0]?.content?.parts || [];
                      for (const part of parts) {
                          if (part.text) {
                              fullBotResponse += part.text;
                              setMessages(prev => {
                                  const newMessages = [...prev];
                                  const lastMsg = newMessages[newMessages.length - 1];
                                  if (lastMsg) lastMsg.text = fullBotResponse;
                                  return newMessages;
                              });
                          } else if (part.functionCall) {
                              detectedFunctionCalls.push(part.functionCall);
                          }
                      }
                  } catch (error) {
                      console.warn("Could not parse stream line as JSON:", jsonString, error);
                  }
              }
          }
      }
      
      const modelResponseParts = [];
      if (fullBotResponse) modelResponseParts.push({ text: fullBotResponse });
      if (detectedFunctionCalls.length > 0) {
        detectedFunctionCalls.forEach(call => modelResponseParts.push({ functionCall: call }));
      }
      
      const newHistory = [...historyForAPI];
      if (modelResponseParts.length > 0) {
        newHistory.push({ role: "model", parts: modelResponseParts });
      }

      if (detectedFunctionCalls.length > 0) {
          setMessages(prev => {
              const newMessages = [...prev];
              const lastMsg = newMessages[newMessages.length - 1];
              if (lastMsg) {
                lastMsg.text = detectedFunctionCalls.length > 1 ? "Processing your requests..." : `Running ${detectedFunctionCalls[0].name.replace(/_/g, ' ')}...`
              };
              return newMessages;
          });

          const functionResponses = [];
          for (const call of detectedFunctionCalls) {
              const toolToCall = availableTools[call.name];
              if (toolToCall) {
                const result = await toolToCall(call.args);
                functionResponses.push({
                    functionResponse: { name: call.name, response: result }
                });
              } else {
                console.error(`Tool not found: ${call.name}`);
                functionResponses.push({
                    functionResponse: { name: call.name, response: { success: false, error: `Tool '${call.name}' is not implemented.`} }
                });
              }
          }
          
          newHistory.push({ role: "function", parts: functionResponses });
          setChatHistory(newHistory);
          await handleGeminiResponse(newHistory);

      } else {
          setChatHistory(newHistory);
          setMessages(prev => {
              const newMessages = [...prev];
              const lastMsg = newMessages[newMessages.length - 1];
              if (lastMsg) lastMsg.isLoading = false;
              return newMessages;
          });
          setQuickReplies([
            { title: "Suggest a healthy meal", payload: "Suggest a healthy meal for current time based on my logs." },
            { title: "Plan my workout", payload: "Can you plan a workout for me for today?" },
            { title: "How is my todays's progress?", payload: "Tell me more about my today's progress." },
            { title: "Log my lunch", payload: "Log my lunch" },
            { title: "Log water", payload: "Log water." },
            { title: "Log my sleep", payload: "Log my sleep." },

          ]);
          setIsLoading(false);
      }
  };

  const handleSendMessage = async (e) => {
      e.preventDefault();
      if (!userInput.trim() || isLoading) return;
      const userMessageText = userInput;
      setMessages(prev => [...prev, { sender: 'user', text: userMessageText }]);
      setUserInput('');
      setQuickReplies([]);
      const newHistory = [...chatHistory, { role: "user", parts: [{ text: userMessageText }] }];
      setChatHistory(newHistory);
      let retries = 3;
      let delay = 1000;
      while (retries > 0) {
          try {
              await handleGeminiResponse(newHistory);
              return;
          } catch (error) {
              if (error.message.includes('429')) {
                  retries--;
                  if (retries === 0) {
                      setMessages(prev => [...prev, { sender: 'bot', text: "The server is too busy. Please try again in a moment.", isLoading: false }]);
                      setIsLoading(false);
                      return;
                  }
                  await new Promise(res => setTimeout(res, delay));
                  delay *= 2;
              } else {
                  console.error("Error sending message:", error);
                  setMessages(prev => [...prev, { sender: 'bot', text: `An error occurred: ${error.message}`, isLoading: false }]);
                  setIsLoading(false);
                  return;
              }
          }
      }
  };

  const handleQuickReply = (payload) => {
    if (isLoading) return;
    setUserInput(payload);
    setTimeout(() => {
        const form = document.querySelector('.message-form');
        form.requestSubmit();
    }, 0);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

    :root {
        --background-dark: #0D1117;
        --chat-window-bg: #161B22;
        --bot-bubble-bg: #21262d;
        --user-bubble-bg: linear-gradient(135deg, #2563eb, #3b82f6);
        --header-accent: #58a6ff;
        --text-primary: #e6edf3;
        --text-secondary: #7d8590;
        --border-color: #30363d;
        --input-bg: #010409;
        --accent-blue: #3b82f6;
        --accent-blue-hover: #2563eb;
    }

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
          background-color: var(--background-dark);
          color: var(--text-primary);
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        .app-container {
          display: flex;
          flex-direction: column;
          height: 100vh;
          width: 100%;
          max-width: 800px;
          margin: 0 auto;
          background-color: var(--background-dark);
        }

        .app-header {
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
          background-color: var(--background-dark);
        }
        
        .logo-container {
            display: flex;
            align-items: center;
            gap: 0.75rem;
        }

        .logo-svg {
            width: 32px;
            height: 32px;
            color: var(--header-accent);
        }

        .app-header h1 {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .chat-window {
          flex: 1;
          overflow-y: auto;
          padding: 1.5rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .message-container {
            display: flex;
            gap: 0.75rem;
            max-width: 85%;
        }

        .message-container.user {
            align-self: flex-end;
            flex-direction: row-reverse;
        }

        .message-container.bot {
            align-self: flex-start;
        }
        
        .avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            flex-shrink: 0;
            margin-top: 4px;
        }

        .bot-avatar {
            background: var(--bot-bubble-bg);
            color: var(--header-accent);
        }
        
        .bot-avatar svg {
            width: 24px;
            height: 24px;
        }

        .user-avatar {
            background: var(--accent-blue);
            color: white;
        }

        .message-bubble {
          padding: 0.75rem 1.25rem;
          border-radius: 1.25rem;
          word-wrap: break-word;
          line-height: 1.6;
          font-size: 1rem;
          animation: pop-in 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        
        @keyframes pop-in {
            from { transform: scale(0.9); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }

        .message-bubble.user {
          background: var(--user-bubble-bg);
          color: white;
          border-bottom-right-radius: 0.5rem;
        }

        .message-bubble.bot {
          background-color: var(--bot-bubble-bg);
          color: var(--text-primary);
          border-bottom-left-radius: 0.5rem;
        }
        
        .message-bubble strong {
          color: var(--header-accent);
          font-weight: 600;
        }
        .message-bubble ul {
          padding-left: 1.25rem;
          margin-top: 0.5rem;
        }
        .message-bubble li {
          margin-bottom: 0.25rem;
        }

        .typing-indicator {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 10px 0;
        }
        .typing-indicator span {
            height: 8px;
            width: 8px;
            background-color: var(--text-secondary);
            border-radius: 50%;
            display: inline-block;
            animation: bounce 1.4s infinite ease-in-out both;
        }
        .typing-indicator span:nth-child(1) { animation-delay: -0.32s; }
        .typing-indicator span:nth-child(2) { animation-delay: -0.16s; }
        @keyframes bounce {
            0%, 80%, 100% { transform: scale(0); }
            40% { transform: scale(1.0); }
        }

        .app-footer {
          padding: 1rem;
          border-top: 1px solid var(--border-color);
          background-color: var(--background-dark);
        }

    .message-form {
        display: flex;
        align-items: center;
        background-color: var(--input-bg);
        border: 1px solid var(--border-color);
        border-radius: 2rem;
        padding: 0.25rem 0.25rem 0.25rem 1.25rem;
        transition: border-color 0.2s;
    }
        .message-form:focus-within {
          border-color: var(--accent-blue);
        }

    .message-form input {
            flex: 1;
        background-color: transparent;
        border: none;
        color: var(--text-primary);
        font-size: 1rem;
    }
        .message-form input:focus { outline: none; }
        .message-form input::placeholder { color: var(--text-secondary); }

    .message-form button {
        background: transparent !important;
        border: none;
        cursor: pointer;
        width: 40px;  /* This rule makes both buttons the same size */
        height: 40px; /* This rule makes both buttons the same size */
        padding: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .message-form button img {
        width: 100%;
        height: 100%;
        transition: transform 0.2s;
    }
    .voice-overlay-close-button {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0;
    }

    .voice-overlay-close-button img {
        width: 36px;
        height: 36px;
        opacity: 0.8;
        transition: opacity 0.2s;
    }
            .message-form button:not(:disabled):hover img {
        transform: scale(1.1);
    }
        .message-form button:hover { background-color: var(--accent-blue-hover); }
    .message-form button:disabled {
        cursor: not-allowed;
        filter: grayscale(80%);
    }
        .message-form button:not(:disabled):active {
            transform: scale(0.95);
        }

        .spinner {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 3px solid rgba(255, 255, 255, 0.3);
          border-top-color: #ffffff;
          animation: spin 1s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        
        .quick-replies-container {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          justify-content: flex-start;
          animation: slide-up 0.4s ease-out;
        }
        @keyframes slide-up {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        .quick-reply-button {
          background-color: var(--bot-bubble-bg);
          color: var(--text-primary);
          border: 1px solid var(--border-color);
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          font-size: 0.875rem;
          font-family: 'Inter', sans-serif;
          font-weight: 500;
          cursor: pointer;
          transition: background-color 0.2s, transform 0.1s;
        }
        .quick-reply-button:hover {
          background-color: #30363d;
          border-color: #4b5563;
        }
        .quick-reply-button:active {
            transform: scale(0.97);
        }
        .voice-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: var(--background-dark);
          z-index: 1000;
          display: flex;
          flex-direction: column;
          animation: fade-in 0.3s ease;
        }

        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .voice-overlay-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
          flex-shrink: 0;
        }

        .voice-overlay-header h3 {
          font-size: 1.25rem;
          color: var(--text-primary);
        }
        
        .voice-overlay-content {
          flex-grow: 1;
          overflow: hidden;
        }
    .voice-overlay-close-button:hover img {
        opacity: 1;
    }
    .voice-button-container {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 8px; /* UPDATED: This adds space between the icons */
    }


    .voice-tooltip {
      position: absolute;
      bottom: 120%;
      left: 50%;
      transform: translateX(-50%);
      
      background-color: var(--bot-bubble-bg);
      color: var(--text-primary);
      padding: 6px 12px;
      border-radius: 8px;
      font-size: 0.8rem;
      font-weight: 500;
      white-space: nowrap;
      z-index: 10;
    }

    .voice-tooltip::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border-width: 5px;
        border-style: solid;
        border-color: var(--bot-bubble-bg) transparent transparent transparent;
    }

      `}</style>

      <VoiceModeOverlay 
        isOpen={isVoiceModeOpen} 
        onClose={() => setIsVoiceModeOpen(false)}
        url={voiceAppUrl}
      />
      <div className="app-container">
        {/* <Header /> */}
        <main className="chat-window">
          {messages.map((msg, index) => (
            <MessageBubble key={index} msg={msg} userDetails={userDetails} /> // UPDATED: Pass userDetails here
          ))}
          <div ref={messagesEndRef} />
        </main>
        {!isLoading && quickReplies.length > 0 && (
          <QuickReplies replies={quickReplies} onQuickReply={handleQuickReply} />
        )}
        <MessageInput
          userInput={userInput}
          setUserInput={setUserInput}
          handleSendMessage={handleSendMessage}
          isLoading={isLoading}
          userDetails = {userDetails}
          onVoiceModeClick={handleVoiceModeToggle} // Pass the handler here
        />
      </div>
    </>
  );
}
