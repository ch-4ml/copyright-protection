
pushd ../test-network
CC_SRC_LANGUAGE="go"
# deploy chaincode 1
CC_SRC_PATH="../chaincode/copyright-protection/cpcc1/"
CC_NAME="cpcc1"
./network.sh deployCC -ccn ${CC_NAME} -ccv 1 -ccl ${CC_SRC_LANGUAGE} -ccp ${CC_SRC_PATH}

rm -rf ${CC_NAME}.tar.gz

# deploy chaincode 2
CC_SRC_PATH="../chaincode/copyright-protection/cpcc1/"
CC_NAME="cpcc2"
./network.sh deployCC2 -ccn ${CC_NAME} -ccv 1 -ccl ${CC_SRC_LANGUAGE} -ccp ${CC_SRC_PATH}

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
