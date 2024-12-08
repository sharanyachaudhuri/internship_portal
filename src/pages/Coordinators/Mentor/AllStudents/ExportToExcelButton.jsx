import React, { useState } from "react";
import * as XLSX from "xlsx";
import { getCurrentIndianDateTime } from "../../../../Global/getTime";
import { DownloadIcon } from "@chakra-ui/icons";
import { Button } from "@chakra-ui/react";
import { useToast } from "@chakra-ui/react";
import showToast from "../../../../Global/Toast";

function ExportToExcelButton({ excelData, department, batch }) {
  const [workbook, setWorkbook] = useState(null);
  const toast = useToast();

  const handleExport = () => {
    let filteredData = excelData;

    // Filter the data by batch if batch is specified
    if (batch) {
      filteredData = excelData.filter((student) => student.batch === batch);
    }

    // Show error if there's no data for the selected batch
    if (!filteredData || filteredData.length === 0) {
      showToast(toast, "Error", "error", "No data available for the selected batch");
      return;
    }

    // Add "Company Name" to each row of data
    const dataWithCompanyName = filteredData.map((student) => ({
      ...student,
      "Company Name": student.Company || "N/A", // Add Company Name with fallback if not available
    }));

    // Create Excel sheet and workbook
    const worksheet = XLSX.utils.json_to_sheet(dataWithCompanyName);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");

    // Get current date and time
    const { date, time } = getCurrentIndianDateTime();

    // Show error if department or data is not valid
    if (department === "data" || !excelData) {
      showToast(toast, "Error", "error", "Try Again Later");
      return;
    }

    // Download Excel file
    XLSX.writeFile(workbook, `${department}-${time}-${date}.xlsx`);
  };

  // Render button only if there's data available
  return excelData.length >= 1 ? (
    <div style={{ width: "100%", padding: "5px 2vw", display: "flex", justifyContent: "flex-end" }}>
      <Button
        onClick={handleExport}
        rightIcon={<DownloadIcon />}
        colorScheme="green"
        variant="outline"
      >
        Download
      </Button>
    </div>
  ) : null;
}

export default ExportToExcelButton;
