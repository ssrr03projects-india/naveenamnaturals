/**
 * DTDC Status Codes and Reason Descriptions
 * Source: Provided user documentation list.
 */

// Tracking Status Codes (DOMESTIC TRACK EVENTS)
const TRACKING_STATUS_CODES = {
  PCSC: "Pickup Scheduled",
  PCUP: "Picked Up",
  PCNO: "Not Picked",
  PCAW: "Pickup Awaited",
  PCAN: "Archived",
  BKD: "Booked",
  IPMF: "In Transit",
  OPMF: "In Transit",
  ORMF: "In Transit",
  IBMD: "In Transit",
  OBMD: "In Transit",
  IBMN: "In Transit",
  OBMN: "In Transit",
  IMBM: "In Transit",
  OMBM: "In Transit",
  IRBO: "In Transit",
  ORBO: "In Transit",
  CDIN: "In Transit",
  CDOUT: "In Transit",
  ARAP: "Arrived At Airport",
  LNRC: "Not Received",
  CSCL: "Customs Cleared",
  CHLD: "Customs HeldUp",
  HLDUP: "Held Up",
  IRMF: "Mis Route",
  OUTDLV: "Out For Delivery",
  NONDLV: "Not Delivered",
  DLV: "Delivered",
  IRTO: "RTO Received",
  RTO: "RTO Processed & Forwarded",
  RTOOPMF: "RTO In Transit",
  RTOIPMF: "RTO In Transit",
  RTOIRMF: "RTO In Transit",
  RTOOBMD: "RTO In Transit",
  RTOIBMD: "RTO In Transit",
  RTOOBMN: "RTO In Transit",
  RTOIBMN: "RTO In Transit",
  RTOOMBM: "RTO In Transit",
  RTOIMBM: "RTO In Transit",
  RTOORBO: "RTO In Transit",
  RTOIRBO: "RTO In Transit",
  RTOCDOUT: "RTO In Transit",
  RTOCDIN: "RTO In Transit",
  RTOINSCAN: "RTO In Transit",
  RTOOUTDLV: "RTO Out For Delivery",
  RETURND: "RTO Returned/RTO Out For Delivery",
  RTORETURND: "RTO Returned/RTO Out For Delivery",
  RTONONDLV: "Not Delivered",
  RTODLV: "RTO Delivered",
  SPL: "Softdata Upload",
  SETRTO: "Set RTO initiated",
  RTOW: "Waiting For RTO Approval From Origin",
  STOPDLV: "Stop Booking/Delivery",
  REVOKESTOPDLV: "Revoke Stop Booking/Delivery",
  PCRA: "Pickup Reassigned",
  RTOORMF: "RTO Mis Route",
  RTORADCDIN: "RTO Reached At Destination",
  PREPERD: "DRS Prepared",
  SUI: "Shipment under investigation",
  DRAW: "Dropoff Awaited",
  DRSC: "Dropoff Scheduled",
  DRCOM: "Dropoff Completed",
  DRCAN: "Dropoff Cancelled",
  DRREC: "Dropoff Rejected",
  INSCAN: "Reached At Destination",
  RADCDIN: "Reached At Destination",
  HELDUP: "Held Up At Facility",
  RELHLD: "Released From Facility",
  RTOBKD: "RTO Booked",
};

// Non-Delivery Reason Codes
const NON_DELIVERY_REASONS = {
  ADR: "ADDRESS INCOMPLETE OR WRONG-(CIR)",
  CAD: "RECEIVER REQUESTED DELIVERY ON ANOTHER DATE-(CIR)",
  CAN: "COLLECTION AMOUNT NOT READY-(CIR)",
  COC: "COVID 19 - CUSTOMER REFUSED TO ACCEPT",
  CWP: "ADDRESS CORRECT AND PINCODE WRONG-(CIR)",
  DLK: "OFFICE CLOSED OR DOOR LOCK-(CIR)",
  DNM: "CONTACT NAME / DEPT NOT MENTIONED-(CIR)",
  DTD: "RECEIVER REFUSE DELIVERY DUE TO DAMAGE-(DIR)",
  LDO: "LAST DATE OVER FOR SUBMISSION-(OTR)",
  MIS: "LAST MILE MISROUTE-(OTR)",
  NSP: "ADDRESS OK BUT NO SUCH PERSON-(CIR)",
  NSR: "AREA NON SERVICEABLE-(DIR)",
  PCC: "CUSTOMER WILL SELF COLLECT-(CIR)",
  PNA: "RECEIVER NOT AVAILABLE-(CIR)",
  PRF: "RECEIVER REFUSED DELIVERY(CIR)",
  PSF: "RECEIVER SHIFTED FROM GIVEN ADDRESS-(CIR)",
  REA: "RESTRICTED ENTRY-(OTR)",
  LST: "CONSIGNMENT LOST-(OTR)",
  UAT: "COULD NOT ATTEMPT-(DIR)",
  COL: "COVID 19 - OFFICE CLOSED/DOOR LOCKED",
  RWO: "RECEIVER WANTS OPEN DELIVERY-(CIR)",
  RRT: "CONSIGNOR REFUSED RTO SHIPMENT-(CIR)",
  LHL: "LOCAL HOLIDAY-(OTR)",
  PWR: "PAPERWORK REQUIRED-(OTR)",
  CNA: "COVID19 COULD NOT ATTEMPT",
};

/**
 * Get human readable status description
 * @param {string} code
 * @returns {string} description
 */
const getStatusDescription = (code) => {
  return TRACKING_STATUS_CODES[code] || code || "Unknown Status";
};

/**
 * Get human readable non-delivery reason
 * @param {string} code
 * @returns {string} description
 */
const getReasonDescription = (code) => {
  return NON_DELIVERY_REASONS[code] || code || "";
};

module.exports = {
  TRACKING_STATUS_CODES,
  NON_DELIVERY_REASONS,
  getStatusDescription,
  getReasonDescription,
};
