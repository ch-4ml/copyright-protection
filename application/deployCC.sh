
pushd ../test-network
CC_SRC_LANGUAGE="go"
# deploy chaincode 1
CC_NAME="cpcc1"
CC_SRC_PATH="../chaincode/copyright-protection/cpcc1/"
CC_END_POLICY="OR('Org1MSP.peer','Org2MSP.peer')"
./network.sh deployCC -ccn ${CC_NAME} -ccv 1 -ccl ${CC_SRC_LANGUAGE} -ccp ${CC_SRC_PATH} -ccep ${CC_END_POLICY}

rm -rf ${CC_NAME}.tar.gz

# deploy chaincode 2
CC_NAME="cpcc2"
CC_SRC_PATH="../chaincode/copyright-protection/cpcc2/"
CC_END_POLICY="OR('Org1MSP.peer','Org3MSP.peer')"
./network.sh deployCC2 -ccn ${CC_NAME} -ccv 1 -ccl ${CC_SRC_LANGUAGE} -ccp ${CC_SRC_PATH} -ccep ${CC_END_POLICY}

rm -rf ${CC_NAME}.tar.gz

popd

cat <<EOF

Deploy Chaincode.

EOF


pushd ./app1
node enrollAdmin
node registerUser
popd

pushd ./app2
node enrollAdmin
node registerUser
popd

pushd ./app3
node enrollAdmin
node registerUser
popd

cat <<EOF

Enroll Admin, User

EOF
