const admin = require('firebase-admin');
const Groq = require("groq-sdk");

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY || "missing_key",
});

exports.handleChatMessage = async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ success: false, error: "Message is required" });
        }

        // 1. Fetch Turfs Context from Firestore
        const db = admin.firestore();
        const turfsSnapshot = await db.collection('turfs').get();
        
        let turfsData = [];
        turfsSnapshot.forEach(doc => {
            const data = doc.data();
            turfsData.push({
                name: data.turfName || "Unnamed",
                location: data.location || "Unknown location",
                price: data.pricePerHour || "Unknown price",
                sports: data.sportsAvailable || [],
                amenities: data.amenities || []
            });
        });

        const contextString = JSON.stringify(turfsData);

        // 2. Build Groq AI Prompt
        const systemPrompt = `You are a helpful and friendly assistant for Turf Connect, an app for booking sports turfs. 
        Answer user questions based on the following available turfs: ${contextString}. 
        If a turf is not listed, say you don't have information about it. 
        Keep your answers concise, friendly, and format them nicely. Do not mention raw JSON or ID fields.`;

        // 3. Call Groq LLaMA 3 Model
        const completion = await groq.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: message }
            ],
            model: "llama-3.1-8b-instant", 
        });

        const reply = completion.choices[0]?.message?.content || "I'm sorry, I couldn't understand that.";

        res.json({ success: true, reply });

    } catch (error) {
        console.error("Chat Controller Error:", error);
        res.status(500).json({ success: false, error: "Failed to process chat message." });
    }
};
