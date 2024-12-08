import React, { useCallback, useState } from 'react';
import {
  ChakraProvider,
  Box,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  theme,
  Skeleton,
  Drawer,
  DrawerBody,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerContent,
  DrawerCloseButton,
  FormLabel,
  Input,
  InputGroup,
  Select,
  Stack,
  Button,
  Flex,
  Avatar,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import { Chart } from 'react-google-charts';
import axios from 'axios';
import { useQuery } from '@tanstack/react-query';
import { getUserDetails } from '../../Global/authUtils';
import { url, c_url } from '../../Global/URL';
import {useTheme} from '../../Global/ThemeContext';
import showToast from '../../Global/Toast';
import AddMentor from '../Admin/addMentor';
import Alert from '../../components/Alert/alert';

//New code
import { useDropzone } from 'react-dropzone';
import * as XLSX from 'xlsx';
//end


const Dashboard = () => {

  const [user, setUser] = useState(false);
  const [pieData, setPieData] = useState([['Company', 'Number of Students']]);
  const [barData, setBarData] = useState([['Department', 'Total Students']]);
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [admin_profile_url, setAdminProfilePicture] = useState('');
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contactNo, setContactNo] = useState('');
  const [department, setDepartment] = useState('');
  const [emailError, setEmailError] = useState('');
  const [contactNoError, setContactNoError] = useState('');
  const [showDataModal, setshowDataModal] = useState(false);
  const toast = useToast();
  const firstField = React.useRef();
  const {theme: colors} = useTheme();
  const accessToken = localStorage.getItem('IMPaccessToken');

    //New code
    const [csvData, setCsvData] = useState([]);
    const [errors, setErrors] = useState([]);
    const [selectedFile, setSelectedFile] = useState(null);


    const onDrop = useCallback((acceptedFiles) => {
        const file = acceptedFiles[0];
        setSelectedFile(file); // Update the selected file state
      
        try {
          if (file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
            handleExcelFile(file);
          } else {
            throw new Error({ field: 'file', message: 'Invalid file type. Please upload an Excel (.xlsx) file.' });
          }
        } catch (error) {
          setErrors([{ field: 'file', message: 'Invalid file type. Please upload an Excel (.xlsx) file.' }]);
          console.error(error);
        }
      }, []);
      
      const handleExcelFile = (file) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const data = e.target.result;
      
          if (!file.name.endsWith('.xlsx')) {
            setErrors([{ field: 'file', message: 'Invalid file type. Please upload an Excel (.xlsx) file.' }]);
            console.error('Invalid file type. Please upload an Excel (.xlsx) file.');
            return;
          }
      
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
      
          const { filteredData, validationErrors } = filterColumns(jsonData);
          if (validationErrors.length === 0) {
            setCsvData(filteredData);
            setErrors([]);
            console.log('Parsed Excel Data:', filteredData); // Log the parsed data to the console
          } else {
            setErrors(validationErrors);
            console.error('Validation errors:', validationErrors); // Log validation errors to the console
          }
        };
        reader.readAsBinaryString(file);
      };

      const uploadExcel = async () => {
        try {
          const response = await axios.post(url + '/coordinator/add/mentors', { csvData, department: user.department });
          if (response.data.success) {
            showToast(toast, "Success", 'success', response.data.msg);
            setshowDataModal(false);
          } else {
            showToast(toast, "Error", 'error', response.data.msg);
            setshowDataModal(false);
          }
          setCsvData([]);
        } catch (error) {
          showToast(toast, "Error", 'error', "Something went Wrong");
          setshowDataModal(false);
        }
      }

      const downloadTemplate = async () => {
        try {
          const response = await axios.get(url + '/download-template', {
            responseType: 'blob' // Specify the response type as blob
          });
          const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      
          const link = document.createElement('a');
          link.href = blobUrl;
          link.setAttribute('download', 'faculty-upload-template-department.xlsx');
          document.body.appendChild(link);
          link.click();
          link.parentNode.removeChild(link);
        } catch (error) {
          showToast(toast, "Error", 'error', "Something went Wrong");
        }
      };

      const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
        }
      });

      const filterColumns = (data) => {
        const uniqueErrors = new Set();
    
        const filteredData = data.map((row, index) => {
            const errors = [];
    
            // Validate name
            if (!row.name || row.name.trim() === '') {
                errors.push({ field: 'name', message: `Name is required for row ${index + 1}` });
            }
    
            // Validate email domain
            const emailRegex = /^[^\s@]+@somaiya\.edu$/i;
            if (!row.email || !emailRegex.test(row.email)) {
                errors.push({ field: 'email', message: `Invalid or missing email for row ${index + 1}. It should be of @somaiya.edu domain.` });
            }
    
            // Validate contact number length
            const contactNoRegex = /^\d{10}$/;
            if (!row.contact_no || !contactNoRegex.test(row.contact_no)) {
                errors.push({ field: 'contact_no', message: `Invalid or missing contact number for row ${index + 1}. It should be 10 digits long.` });
            }
    
            if (errors.length > 0) {
                errors.forEach((error) => {
                    uniqueErrors.add(JSON.stringify(error));
                });
                return null;
            }
    
            return {
                name: row.name,
                email: row.email,
                contact_no: row.contact_no,
            };
        });
    
        const validationErrors = [...uniqueErrors].map((errorString) => JSON.parse(errorString));
    
        return {
            filteredData: filteredData.filter((row) => row !== null),
            validationErrors,
        };
    };
    

      //end

  const validateEmail = () => {
    const emailRegex = /^[^\s@]+@somaiya\.edu$/;
    if (!emailRegex.test(email)) {
        setEmailError('Invalid email format');
        return false;
    }
    setEmailError('');
    return true;
};

const validateContactNo = () => {
    const contactNoRegex = /^[0-9]{10}$/;
    if (!contactNoRegex.test(contactNo)) {
        setContactNoError('Invalid contact number');
        return false;
    }
    setContactNoError('');
    return true;
};

const handleAddCoord = async () => {
    if (validateEmail() && validateContactNo()) {
        console.log(name, email, contactNo);
        onClose();
        const current_user = await getUserDetails();
        setUser(current_user)
        try {

            const response = await axios.post(url + '/admin/add/coordinator', { name, email, contact_no: contactNo.toString(), department});
            console.log(response.data)
            if (response.data.success) {
                showToast(toast, "Success", 'success', "Coordinator Registered Successfully");
            } else {
                showToast(toast, "Warning", 'info', "Coordinator Already Exists");
            }
        } catch (error) {
            showToast(toast, "Error", 'error', "Something Went Wrong !");
        }
    }
    else {
        if (!validateEmail()) {
            showToast(toast, "Error", 'error', "Provide a valid Somaiya Email");
        } else if (!validateContactNo()) {
            showToast(toast, "Error", 'error', "Provide a valid Contact no.");
        }
    }
};
  const { isError, isLoading, data } = useQuery({
    queryKey: ['/admin/statistics/all'],
    retryDelay: 1000 * 60 * 2,
    queryFn: async () => {
      if (!user) {
        var current_user = await getUserDetails();
        setUser(current_user);
      } else {
        var current_user = user;
      }

      const getUser = async () => {
        try {
          const data = await axios.post(url + "/anyuser", { accessToken });
          const user = data.data.msg._doc;
          return user;
        } catch (error) {
          console.log(error);
          localStorage.removeItem('IMPaccessToken');
        }
      };

      const fetchData = async () => {
        try{
        const userInfo = await getUser();
          setAdminName(userInfo.name);
          setAdminEmail(userInfo.email);
          setAdminProfilePicture(userInfo.profile_picture_url);
        }
        catch(error){
          console.log(error)
        }
      }
      fetchData();

      const response = await axios.post(url + `/admin/statistics`);
      const temp = response.data.data;

      console.log(temp);
      setPieData([['Company', 'Number of Students']]);
      setBarData([['Department', 'Total Students']]);
      setPieData((x) => [...x, ...temp.topCompanies.map(company => [company._id, company.count])]);
      // setBarData((x) => [...x, ...temp.departmentWiseDistribution.map(company => [company._id, company.count])]);

      setBarData((x) => [
        ...x,
        ...temp.departmentWiseDistribution.map((company) => [
          mapDepartment(company._id),
          company.count,
        ]),
      ]);

      function mapDepartment(department) {
        switch (department) {
          case "Information Technology":
            return "IT";
          case "Computer Engineering":
            return "COMPS";
          case "Mechanical Engineering":
            return "MECH";
          case "Electronics And Telecommunication Engineering":
            return "EXTC";
          case "Electronics Engineering":
            return "ETRX";
          default:
            return department;
        }
      }

      return temp;
    },
  });


  // const barData = [
  //   ['Department', 'Total Students'],
  //   ['Comps', 50],
  //   ['IT', 45],
  //   ['EXTC', 60],
  //   ['ETRX', 70],
  //   ['Mechanical', 30],
  // ];

  const barOptions = {
    chart: {
      title: 'Department Wise Student Count',
    },
  };

  // Data and options for the pie chart

  const viewstudent = async () => {
    window.location.href= c_url + "admin/dashboard/viewstudent";
  }
  const viewmentor = async () => {
    window.location.href= c_url + "admin/dashboard/viewmentor";
  }
  const viewcoord = async () => {
    window.location.href= c_url + "admin/dashboard/viewcoordinator";
  }

  const pieOptions = {
    title: 'Student Distribution',
    pieHole: 0.4,
  };

  const hbarData = [
    ['E', 'D', { role: 'style' }],
    ['C', 8.94, 'light blue'], // RGB value
    ['S', 10.49, 'red'], // English color name
    ['G', 19.3, 'black'],
    ['P', 21.45, 'color: #e5e4e2'], // CSS-style declaration
  ];

  const hbarOptions = {
    title: 'Random Chart',
    chartArea: { width: '50%' },
    hAxis: {
      title: 'r1',
      minValue: 0,
    },
    vAxis: {
      title: 'R2',
    },
    legend: { position: 'none' },
  };

  const lineData = [
    ['Month', 'Series 1', 'Series 2', 'Series 3'],
    ['Jan', 37.8, 80.8, 41.8],
    ['Feb', 30.9, 69.5, 32.4],
    ['Mar', 25.4, 57, 25.7],

    // ... (Add more data points if necessary)
  ];

  const lineOptions = {
    chart: {
      title: 'Random 2',
    },
    width: 550,

    series: {
      // Gives each series an axis name that matches the Y-axis below.
      0: { axis: 'Series1' },
      1: { axis: 'Series2' },
      2: { axis: 'Series3' },
    },
    axes: {
      // Adds labels to each axis; they don't have to match the axis names.
      y: {
        Series1: { label: 'Series 1' },
        Series2: { label: 'Series 2' },
        Series3: { label: 'Series 3' },
      },
    },
  };


  if (isLoading) {
    return (
      <Stack>
        <Skeleton height='30px' />
        <Skeleton height='30px' />
        <Skeleton height='20px' />
        <Skeleton height='500px' />
      </Stack>
    )
  }

  if (isError) {
    return <div>Something Went Wrong, Try Reloading if the problem persists</div>
  }


  return (
    <ChakraProvider theme={theme}>

      <Box maxW="1200px" mx="auto" py={5} px={2}>
      <Flex justify="space-between" align="center">
      <Button color={colors.font} bg={colors.hover} ml="auto" onClick={onOpen}>Add Coordinator</Button>
      <AddMentor/>
      </Flex>
      <Flex align="center">
            <Avatar size="md" bg='red.700' color="white" name={adminName} src={admin_profile_url} className="h-10 w-10 mr-2"></Avatar>
            <div>
              <div className={`text-base text-${colors.font} w-full font-semibold`}>{adminName}</div>
              <p className={`text-${colors.font} text-xs w-full`}>{adminEmail}</p>
            </div>
          </Flex>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={5} mt={5} mb={5}>
          <Button colorScheme="red" onClick={viewstudent}>View Students</Button>
          <Button colorScheme="red" onClick={viewmentor}>View Mentors</Button>
          <Button colorScheme="red" onClick={viewcoord}>View Coordinators</Button>
        </SimpleGrid>

        <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={5}>
          {/* Stat Cards */}
          <Stat bg="blue.100" p={4} borderRadius="md">
            <StatLabel>Total Students Interning</StatLabel>
            <StatNumber>{data.studentsInAllDepartments}</StatNumber>
            <StatHelpText>Combined count of all Departments</StatHelpText>
          </Stat>
          <Stat bg="green.100" p={4} borderRadius="md">
            <StatLabel>Average Internship Duration</StatLabel>
            <StatNumber>{Number(data.avgInternshipDuration[0]?.avgDuration).toFixed(2)}</StatNumber>
            <StatHelpText>Duration displayed is in weeks</StatHelpText>
          </Stat>
          <Stat bg="pink.100" p={4} borderRadius="md">
            <StatLabel>Total students having Mentors</StatLabel>
            <StatNumber>{data.assignedStudents}</StatNumber>
            <StatHelpText>Students being mentored currently</StatHelpText>
          </Stat>
          {/* <Stat bg="orange.100" p={4} borderRadius="md">
            <StatLabel>Review Completed</StatLabel>
            <StatNumber>35</StatNumber>
            <StatHelpText>This is Static for now</StatHelpText>
          </Stat> */}
        </SimpleGrid>

        <Box mt={10}>
          <SimpleGrid columns={{ base: 1, md: 1, lg: 2 }} spacing={10}>
            {/* Charts */}
            <Box bg="white" p={5} shadow="md" borderRadius="md">
              <Chart
                chartType="Bar"
                width="100%"
                height="400px"
                data={barData}
                options={barOptions}
              />
            </Box>
            <Box bg="white" p={5} shadow="md" borderRadius="md">
              <Chart
                chartType="PieChart"
                width="100%"
                height="400px"
                data={pieData}
                options={pieOptions}
              />
            </Box>
            {/* <Box bg="white" p={5} shadow="md" borderRadius="md">
              <Chart
                chartType="BarChart"
                width="100%"
                height="400px"
                data={hbarData}
                options={hbarOptions}
                chartPackages={['corechart', 'bar']}
              />
            </Box>
            <Box bg="white" p={5} shadow="md" borderRadius="md">
              <Chart
                chartType="LineChart"
                width="100%"
                height="400px"
                data={lineData}
                options={lineOptions}
                chartPackages={['corechart', 'line']}
              />
            </Box> */}
          </SimpleGrid>
        </Box>
      </Box>
      <Drawer
                isOpen={isOpen}
                placement='right'
                initialFocusRef={firstField}
                onClose={onClose}
            >
        <DrawerOverlay />
        <DrawerContent color={colors.font} bg={colors.secondary}>
            <DrawerCloseButton />
            <DrawerHeader borderBottomWidth='0px'>Add a Coordinator</DrawerHeader>
            <DrawerBody>
                <Stack spacing='24px'>
                    <Box>
                        <FormLabel htmlFor='username'>Name</FormLabel>
                        <Input
                            ref={firstField}
                            id='username'
                            placeholder='Name'
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            isRequired
                        />
                    </Box>

                    <Box>
                        <FormLabel htmlFor='email'>E-Mail</FormLabel>
                        <InputGroup>
                            <Input
                                type='email'
                                id='email'
                                placeholder='Email'
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </InputGroup>
                    </Box>
                    <Box>
                        <FormLabel htmlFor='contactno'>Contact No.</FormLabel>
                        <Input
                            ref={firstField}
                            type='tel'
                            id='contactno'
                            placeholder='Contact no.'
                            value={contactNo}
                            onChange={(e) => setContactNo(e.target.value)}
                        />
                    </Box>
                    <Box>
                        <FormLabel htmlFor='department'>Department</FormLabel>
                        <Select
                            id='department'
                            placeholder='Select Department'
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}>
                                <option style={{backgroundColor: colors.secondary, color: colors.font}} selected disabled>Select Department</option>
                                <option style={{backgroundColor: colors.secondary, color: colors.font}} value="Computer Engineering">COMPS</option>
                                <option style={{backgroundColor: colors.secondary, color: colors.font}} value="Information Technology">IT</option>
                                <option style={{backgroundColor: colors.secondary, color: colors.font}} value="Mechanical Engineering">MECH</option>
                                <option style={{backgroundColor: colors.secondary, color: colors.font}} value="Electronics And Telecommunication Engineering">EXTC</option>
                                <option style={{backgroundColor: colors.secondary, color: colors.font}} value="Electronics Engineering">ETRX</option>
                                <option style={{backgroundColor: colors.secondary, color: colors.font}} value="Electronics And Computer Engineering" hidden>EXCP</option>
                                <option style={{backgroundColor: colors.secondary, color: colors.font}} value="Robotics And Artificial Intelligence" hidden>RAI</option>
                                <option style={{backgroundColor: colors.secondary, color: colors.font}} value="Artificial Intelligence And Data Science" hidden>AIDS</option>
                                <option style={{backgroundColor: colors.secondary, color: colors.font}} value="Computer And Communication Engineering" hidden>CCE</option>
                        </Select>
                    </Box>

                     {/* New code  */}
                     <Box>
                              <div
                                {...getRootProps()}
                                className={`dropzone ${isDragActive ? 'active' : ''}`}
                                style={{
                                    border: '2px dashed #ccc',
                                    borderRadius: '4px',
                                    padding: '20px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                }}
                                >
                                <input {...getInputProps()} />
                                {selectedFile ? (
                                    <p>Selected file: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)</p>
                                ) : (
                                    <p>Drag & drop your Excel (.xlsx) file here, or click to select one</p>
                                )}

                                {errors.length > 0 && (
                                    <div style={{ color: 'red', marginTop: '10px' }}>
                                    <p>The following errors were found:</p>
                                    {errors.map((error, index) => (
                                        <p key={index}>{`${error.field} : ${error.message}`}</p>
                                    ))}
                                    </div>
                                )}
                                </div>

                                {showDataModal && (
                                <Alert
                                    onConfirm={uploadExcel}
                                    text={'Upload Excel'}
                                    onClose={() => setshowDataModal(false)}
                                />
                                )}

                                {errors.length === 0 && (
                                <button onClick={() => setshowDataModal(true)} style={{ width: '100%', height: '30px', marginTop: '20px', backgroundColor: '#b4f7ab', borderRadius: '15px' }}>Upload Excel</button>
                                )}

                                <button onClick={downloadTemplate} style={{ width: '100%', height: '30px', marginTop: '20px', backgroundColor: '#b4f7ab', borderRadius: '15px' }}>Download Template</button>

                      </Box>
                       {/* End  */}

                </Stack>
            </DrawerBody>
            <DrawerFooter borderTopWidth='0px'>
                <Button variant='outline' mr={3} onClick={onClose} color={colors.font} bg={colors.hover}>
                    Cancel
                </Button>
                {showDataModal && (
                        <Alert
                        onConfirm={handleAddCoord}
                        text={'Add Coordinator'}
                        onClosec={() => setshowDataModal(false)}

                        />)
                        }
                <Button colorScheme='blue' onClick={()=>setshowDataModal(true)} color={colors.secondary} bg={colors.primary}>
                    Add
                </Button>
            </DrawerFooter>
        </DrawerContent>
    </Drawer>
    </ChakraProvider>
  );
};
export default Dashboard;