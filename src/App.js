import React, { useState, useEffect } from "react";
import "./App.css";

/**
 * Simulate sending the transaction to the blockchain.
 * In a real system, you'd have an API call or an SDK for your blockchain.
 */
async function broadcastTransaction(tx) {
  console.log("Broadcasting transaction...");
  console.log(JSON.stringify(tx, null, 2));
  // TODO: Implement actual broadcasting to your chain.
  return { success: true, txid: "dummy-tx-id" };
}

/**
 * Validates if a transaction requires a third record based on:
 * - If an output address != prerotated_key_hash
 * - If the relationship field is not blank
 */
function needsThirdRecord(record2) {
  if (!record2) return false;

  const { outputs = [], prerotated_key_hash, relationship } = record2;

  // If any output address != record2.prerotated_key_hash
  const mismatch = outputs.some((o) => o.address !== prerotated_key_hash);

  if (mismatch || (relationship && relationship.trim() !== "")) {
    return true;
  }
  return false;
}

/** 
 * Mock function that "scans" the hardware wallet 
 * to get the next rotation’s public key + H+1 + H+2.
 * In a real app, you'd integrate a QR-scanner library here.
 */
function scanNextRotation(rotationIndex) {
  // The user would physically scan 3 QR codes (Addr, H+1, H+2)
  // For demonstration, we just return mock strings:
  return {
    publicKey: `MockPubKey_for_Rotation${rotationIndex}`,
    hPlus1: `Mock_H+1_for_Rotation${rotationIndex}`,
    hPlus2: `Mock_H+2_for_Rotation${rotationIndex}`,
  };
}

function App() {
  // --------------------------------------------------
  // Record 1 (existing or new on-chain)
  // --------------------------------------------------
  const [record1, setRecord1] = useState({
    twice_prerotated_key_hash: "",
    prerotated_key_hash: "",
    public_key: "",
    outputs: [{ address: "", amount: 0 }],
    relationship: "",
  });

  // --------------------------------------------------
  // Record 2 (built on-demand)
  // --------------------------------------------------
  const [record2, setRecord2] = useState({
    twice_prerotated_key_hash: "",
    prerotated_key_hash: "",
    public_key: "",
    outputs: [{ address: "", amount: 0 }],
    relationship: "",
  });

  // --------------------------------------------------
  // Record 3 (only if triggered)
  // --------------------------------------------------
  const [record3, setRecord3] = useState({
    twice_prerotated_key_hash: "",
    prerotated_key_hash: "",
    public_key: "",
    outputs: [{ address: "", amount: 0 }],
    relationship: "",
  });

  // Wizard step (1, 2, or 3)
  const [step, setStep] = useState(1);

  const [validationMessage, setValidationMessage] = useState("");

  // If Record 2 changes, see if we still need Record 3
  useEffect(() => {
    if (!needsThirdRecord(record2)) {
      // Clear record3 if no third record is triggered
      setRecord3({
        twice_prerotated_key_hash: "",
        prerotated_key_hash: "",
        public_key: "",
        outputs: [{ address: "", amount: 0 }],
        relationship: "",
      });
    }
  }, [record2]);

  /**
   * Validate the chain of records (1->2->3) in memory
   * using naive string checks that simulate the white paper's key-log rules.
   */
  const validateRecords = () => {
    let errors = [];

    // Check: record1.twice_prerotated_key_hash == record2.prerotated_key_hash
    if (
      record1.twice_prerotated_key_hash !== record2.prerotated_key_hash &&
      record1.twice_prerotated_key_hash &&
      record2.prerotated_key_hash
    ) {
      errors.push(
        `twice_prerotated_key_hash(Record1) != prerotated_key_hash(Record2)`
      );
    }

    // Check: record1.prerotated_key_hash == record2.public_key
    // (simulating hashed pubkey check)
    if (
      record1.prerotated_key_hash !== record2.public_key &&
      record1.prerotated_key_hash &&
      record2.public_key
    ) {
      errors.push(
        `prerotated_key_hash(Record1) != public_key(Record2) [expected hashed match]`
      );
    }

    // If a 3rd record is triggered...
    if (needsThirdRecord(record2)) {
      // record1.twice_prerotated_key_hash == record3.public_key
      if (
        record1.twice_prerotated_key_hash !== record3.public_key &&
        record1.twice_prerotated_key_hash &&
        record3.public_key
      ) {
        errors.push(
          `twice_prerotated_key_hash(Record1) != public_key(Record3) [expected hashed match]`
        );
      }
      // record2.twice_prerotated_key_hash == record3.prerotated_key_hash
      if (
        record2.twice_prerotated_key_hash !== record3.prerotated_key_hash &&
        record2.twice_prerotated_key_hash &&
        record3.prerotated_key_hash
      ) {
        errors.push(
          `twice_prerotated_key_hash(Record2) != prerotated_key_hash(Record3)`
        );
      }
    }

    if (errors.length === 0) {
      setValidationMessage("✓ Records appear consistent with the key-log rules.");
    } else {
      setValidationMessage("❌ " + errors.join(" | "));
    }
  };

  /**
   * Build a final transaction object with these record fields,
   * then broadcast it (or sign & broadcast).
   */
  const handleBuildAndBroadcast = async () => {
    const scenarioIsThreeRecord = needsThirdRecord(record2);

    const txObject = { records: [] };

    // Add Record 1
    txObject.records.push({
      recordIndex: 1,
      twice_prerotated_key_hash: record1.twice_prerotated_key_hash,
      prerotated_key_hash: record1.prerotated_key_hash,
      public_key: record1.public_key,
      outputs: record1.outputs,
      relationship: record1.relationship,
      signature: "SIGNATURE_1_PLACEHOLDER",
    });

    // Add Record 2
    txObject.records.push({
      recordIndex: 2,
      twice_prerotated_key_hash: record2.twice_prerotated_key_hash,
      prerotated_key_hash: record2.prerotated_key_hash,
      public_key: record2.public_key,
      outputs: record2.outputs,
      relationship: record2.relationship,
      signature: "SIGNATURE_2_PLACEHOLDER",
    });

    // If triggered, add Record 3
    if (scenarioIsThreeRecord) {
      txObject.records.push({
        recordIndex: 3,
        twice_prerotated_key_hash: record3.twice_prerotated_key_hash,
        prerotated_key_hash: record3.prerotated_key_hash,
        public_key: record3.public_key,
        outputs: record3.outputs,
        relationship: record3.relationship,
        signature: "SIGNATURE_3_PLACEHOLDER",
      });
    }

    // Validate and broadcast
    validateRecords();
    const result = await broadcastTransaction(txObject);
    if (result.success) {
      alert(`Transaction broadcasted. TxID: ${result.txid}`);
    } else {
      alert("Broadcast failed.");
    }
  };

  // Helper to update a nested record's outputs
  const handleOutputChange = (recordName, index, field, value) => {
    let record, setRecord;
    if (recordName === "record1") {
      record = { ...record1 };
      setRecord = setRecord1;
    } else if (recordName === "record2") {
      record = { ...record2 };
      setRecord = setRecord2;
    } else {
      record = { ...record3 };
      setRecord = setRecord3;
    }

    const outputsCopy = [...record.outputs];
    outputsCopy[index] = { ...outputsCopy[index], [field]: value };
    record.outputs = outputsCopy;
    setRecord(record);
  };

  // -----------------------------------------
  // AUTO-FILL FROM SCANNING (Record 2)
  // -----------------------------------------
  const handleScanForRecord2 = () => {
    // For example, if we're going from rotation #1 -> #2:
    const rotIndex = 2;
    const scanned = scanNextRotation(rotIndex);
    // scanned.publicKey, scanned.hPlus1, scanned.hPlus2

    setRecord2((prev) => ({
      ...prev,
      public_key: scanned.publicKey,
      prerotated_key_hash: scanned.hPlus1,
      twice_prerotated_key_hash: scanned.hPlus2,
    }));
  };

  // -----------------------------------------
  // AUTO-FILL FROM SCANNING (Record 3)
  // -----------------------------------------
  const handleScanForRecord3 = () => {
    // Suppose this is rotation #3
    const rotIndex = 3;
    const scanned = scanNextRotation(rotIndex);

    // Also remember, per the white paper:
    //  record3.prerotated_key_hash MUST match record2.twice_prerotated_key_hash
    //  we can fill that automatically if the user wants.

    setRecord3((prev) => ({
      ...prev,
      // new public key from scanning
      public_key: scanned.publicKey,
      // new "twice" from scanning
      twice_prerotated_key_hash: scanned.hPlus2,
      // link back to record2's twice
      prerotated_key_hash: record2.twice_prerotated_key_hash,
    }));
  };

  // UI for Step 1 (Record 1)
  const renderStep1 = () => (
    <div className="step-container">
      <h2>Record 1 (Existing or New On-Chain)</h2>
      <p>Fill these fields from your hardware wallet or from the chain.</p>

      <label>twice_prerotated_key_hash:</label>
      <input
        type="text"
        value={record1.twice_prerotated_key_hash}
        onChange={(e) =>
          setRecord1({
            ...record1,
            twice_prerotated_key_hash: e.target.value,
          })
        }
      />

      <label>prerotated_key_hash:</label>
      <input
        type="text"
        value={record1.prerotated_key_hash}
        onChange={(e) =>
          setRecord1({
            ...record1,
            prerotated_key_hash: e.target.value,
          })
        }
      />

      <label>public_key:</label>
      <input
        type="text"
        value={record1.public_key}
        onChange={(e) =>
          setRecord1({ ...record1, public_key: e.target.value })
        }
      />

      <label>relationship (optional):</label>
      <input
        type="text"
        value={record1.relationship}
        onChange={(e) =>
          setRecord1({ ...record1, relationship: e.target.value })
        }
      />
      <p className="field-note">
        <em>
          Typically blank – only used for branching. If you put anything here,
          it triggers a third record.
        </em>
      </p>

      <div className="outputs-section">
        <h4>Outputs (UTXO array)</h4>
        {record1.outputs.map((o, idx) => (
          <div key={idx} className="output-item">
            <label>Address:</label>
            <input
              type="text"
              value={o.address}
              onChange={(e) =>
                handleOutputChange("record1", idx, "address", e.target.value)
              }
            />
            <label>Amount:</label>
            <input
              type="number"
              value={o.amount}
              onChange={(e) =>
                handleOutputChange("record1", idx, "amount", e.target.value)
              }
            />
          </div>
        ))}
      </div>
      <button
        onClick={() => {
          setRecord1({
            ...record1,
            outputs: [...record1.outputs, { address: "", amount: 0 }],
          });
        }}
      >
        + Add Output
      </button>

      <br />
      <button onClick={() => setStep(2)}>Next →</button>
    </div>
  );

  // UI for Step 2 (Record 2)
  const renderStep2 = () => (
    <div className="step-container">
      <h2>Record 2</h2>
      <p>Obtain from the hardware wallet the next rotation's data (on demand).</p>

      <button onClick={handleScanForRecord2}>Scan Next Rotation</button>
      <p className="field-note">
        <em>
          This simulates scanning 3 QRs (Addr, H+1, H+2) from your hardware
          wallet. It auto-fills the fields below.
        </em>
      </p>

      <label>twice_prerotated_key_hash:</label>
      <input
        type="text"
        value={record2.twice_prerotated_key_hash}
        onChange={(e) =>
          setRecord2({
            ...record2,
            twice_prerotated_key_hash: e.target.value,
          })
        }
      />

      <label>prerotated_key_hash:</label>
      <input
        type="text"
        value={record2.prerotated_key_hash}
        onChange={(e) =>
          setRecord2({
            ...record2,
            prerotated_key_hash: e.target.value,
          })
        }
      />

      <label>public_key:</label>
      <input
        type="text"
        value={record2.public_key}
        onChange={(e) =>
          setRecord2({ ...record2, public_key: e.target.value })
        }
      />

      <label>relationship (optional):</label>
      <input
        type="text"
        value={record2.relationship}
        onChange={(e) =>
          setRecord2({ ...record2, relationship: e.target.value })
        }
      />
      <p className="field-note">
        <em>
          Typically blank – only used for branching. If non-blank, triggers a 3rd
          record.
        </em>
      </p>

      <div className="outputs-section">
        <h4>Outputs (UTXO array)</h4>
        {record2.outputs.map((o, idx) => (
          <div key={idx} className="output-item">
            <label>Address:</label>
            <input
              type="text"
              value={o.address}
              onChange={(e) =>
                handleOutputChange("record2", idx, "address", e.target.value)
              }
            />
            <label>Amount:</label>
            <input
              type="number"
              value={o.amount}
              onChange={(e) =>
                handleOutputChange("record2", idx, "amount", e.target.value)
              }
            />
          </div>
        ))}
      </div>

      <button
        onClick={() => {
          setRecord2({
            ...record2,
            outputs: [...record2.outputs, { address: "", amount: 0 }],
          });
        }}
      >
        + Add Output
      </button>
      <br />
      <button onClick={() => setStep(1)}>← Back</button>
      <button onClick={() => setStep(3)}>Next →</button>
    </div>
  );

  // UI for Step 3 (Record 3)
  const renderStep3 = () => {
    const thirdNeeded = needsThirdRecord(record2);

    if (!thirdNeeded) {
      return (
        <div className="step-container">
          <h2>Record 3 (Not Required)</h2>
          <p>
            A 3rd record is only required if:
            <br />
            1) One of the output addresses in Record 2 != prerotated_key_hash
            <br />
            2) The relationship field in Record 2 was non-blank
          </p>
          <p>No triggers found. So no Record 3 is necessary.</p>
          <button onClick={() => setStep(2)}>← Back</button>
          <button onClick={validateRecords}>Check Validation</button>
          <button onClick={handleBuildAndBroadcast}>
            Build &amp; Broadcast
          </button>
          <p style={{ marginTop: "1em" }}>{validationMessage}</p>
        </div>
      );
    }

    return (
      <div className="step-container">
        <h2>Record 3 (Triggered)</h2>
        <p>
          Because you sent to an outside address or used a non-blank relationship
          in Record 2, the white paper says you need a confirming transaction.
        </p>

        <button onClick={handleScanForRecord3}>Scan Next Rotation</button>
        <p className="field-note">
          <em>
            Again, we simulate scanning the hardware wallet for the next
            rotation’s data.
          </em>
        </p>

        <label>twice_prerotated_key_hash:</label>
        <input
          type="text"
          value={record3.twice_prerotated_key_hash}
          onChange={(e) =>
            setRecord3({
              ...record3,
              twice_prerotated_key_hash: e.target.value,
            })
          }
        />

        <label>prerotated_key_hash:</label>
        <input
          type="text"
          value={record3.prerotated_key_hash}
          onChange={(e) =>
            setRecord3({ ...record3, prerotated_key_hash: e.target.value })
          }
        />

        <label>public_key:</label>
        <input
          type="text"
          value={record3.public_key}
          onChange={(e) =>
            setRecord3({ ...record3, public_key: e.target.value })
          }
        />

        <label>relationship (optional):</label>
        <input
          type="text"
          value={record3.relationship}
          onChange={(e) =>
            setRecord3({ ...record3, relationship: e.target.value })
          }
        />
        <p className="field-note">
          <em>
            Typically blank. If non-blank again, it triggers additional steps.
          </em>
        </p>

        <div className="outputs-section">
          <h4>Outputs (UTXO array)</h4>
          {record3.outputs.map((o, idx) => (
            <div key={idx} className="output-item">
              <label>Address:</label>
              <input
                type="text"
                value={o.address}
                onChange={(e) =>
                  handleOutputChange("record3", idx, "address", e.target.value)
                }
              />
              <label>Amount:</label>
              <input
                type="number"
                value={o.amount}
                onChange={(e) =>
                  handleOutputChange("record3", idx, "amount", e.target.value)
                }
              />
            </div>
          ))}
        </div>
        <button
          onClick={() => {
            setRecord3({
              ...record3,
              outputs: [...record3.outputs, { address: "", amount: 0 }],
            });
          }}
        >
          + Add Output
        </button>

        <br />
        <button onClick={() => setStep(2)}>← Back</button>
        <button onClick={validateRecords}>Check Validation</button>
        <button onClick={handleBuildAndBroadcast}>Build &amp; Broadcast</button>
        <p style={{ marginTop: "1em" }}>{validationMessage}</p>
      </div>
    );
  };

  return (
    <div className="App">
      <h1>Hot Wallet (Multi-Record Key Rotation)</h1>
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
    </div>
  );
}

export default App;
