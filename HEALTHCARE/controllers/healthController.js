import HealthRecord from "../models/healthModel.js";

export const addHealthRecord = async (req, res) => {
  try {
    const {
      userId,
      age,
      gender,
      medicalHistory,
      bp,
      sugar,
      heartRate,
      oxygen,
    } = req.body;

    let riskScore = 0;

    // 🔹 Vital Checks
    if (bp > 140) riskScore += 25;
    if (sugar > 150) riskScore += 25;
    if (heartRate > 110) riskScore += 25;
    if (oxygen < 90) riskScore += 30;

    // 🔹 Age Factor
    if (age > 60) riskScore += 25;

    // 🔥 Advanced Disease Mapping
    const diseaseRiskMap = {
      diabetes: 20,
      heart: 25,
      kidney: 25,
      asthma: 15,
      hypertension: 20,
      thyroid: 10,
      migraine: 5,
      headache: 5,
      liver: 20,
    };

    if (medicalHistory) {
      const historyLower = medicalHistory.toLowerCase();

      Object.keys(diseaseRiskMap).forEach((disease) => {
        if (historyLower.includes(disease)) {
          riskScore += diseaseRiskMap[disease];
        }
      });
    }

    // 🔹 ICU Category
    let icuRisk = "Low";
    if (riskScore > 80) icuRisk = "High";
    else if (riskScore > 40) icuRisk = "Moderate";

    const record = await HealthRecord.create({
      userId,
      age,
      gender,
      medicalHistory,
      bp,
      sugar,
      heartRate,
      oxygen,
      riskScore,
      icuRisk,
      confidence: 90,
    });

    res.status(201).json({
      success: true,
      message: "Health record saved successfully",
      data: record,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error saving health record",
      error: error.message,
    });
  }
};


// 🔹 Get User Health History
export const getHealthHistory = async (req, res) => {
  try {
    const records = await HealthRecord.find({
      userId: req.params.userId,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching health history",
      error: error.message,
    });
  }
};