// import propTypes from 'prop-types';
import React, { PureComponent, Component } from 'react';
import Switch from './Switch';
import Tabs from './base/forms/Tabs';
import TabItem from './base/forms/TabItem';
import AvailablePermissionsProvider from '../../common/providers/AvailablePermissionsProvider';
import _data from '../../common/data/base/_data';
import UserGroupList from './UserGroupList';
// import propTypes from 'prop-types';

class EditPermissionsModal extends Component {
  static displayName = 'EditPermissionsModal';

  static propTypes = {};

  constructor(props) {
      super(props);
      AppActions.getAvailablePermissions();
      const url = props.isGroup ? `${props.level}s/${props.id}/user-group-permissions/` : `${props.level}s/${props.id}/user-permissions/`;
      _data.get(`${Project.api}${url}`)
          .then((results) => {
              let entityPermissions = props.isGroup ? _.find(results, r => r.group.id === props.group.id) : _.find(results, r => r.user.id === props.user.id);
              if (!entityPermissions) {
                  entityPermissions = { admin: false, permissions: [] };
              }
              if (this.props.user) {
                  entityPermissions.user = this.props.user.id;
              }
              if (this.props.group) {
                  entityPermissions.group = this.props.group.id;
              }
              this.setState({ entityPermissions });
          });
      this.state = {};
  }

  admin = () => this.state.entityPermissions && this.state.entityPermissions.admin

  hasPermission = (key) => {
      if (this.admin()) return true;
      return this.state.entityPermissions.permissions.includes(key);
  }

  close = () => {
      closeModal();
  }

  save = () => {
      const id = typeof this.state.entityPermissions.id === 'undefined' ? '' : this.state.entityPermissions.id;
      const url = this.props.isGroup ? `${this.props.level}s/${this.props.id}/user-group-permissions/${id}`
          : `${this.props.level}s/${this.props.id}/user-permissions/${id}`;
      this.setState({ isSaving: true });
      const action = id ? 'put' : 'post';
      _data[action](`${Project.api}${url}${id && '/'}`, this.state.entityPermissions)
          .then(() => {
              this.close();
          })
          .catch((e) => {
              this.setState({ isSaving: false, error: e });
          });
  }

  togglePermission = (key) => {
      const index = this.state.entityPermissions.permissions.indexOf(key);
      if (index === -1) {
          this.state.entityPermissions.permissions.push(key);
      } else {
          this.state.entityPermissions.permissions.splice(index, 1);
      }
      this.forceUpdate();
  }

  toggleAdmin = (p) => {
      this.state.entityPermissions.admin = !this.state.entityPermissions.admin;
      this.forceUpdate();
  }

  render() {
      const {
          props: {
              level,
          },
          state: {
              entityPermissions,
              isSaving,
          },
      } = this;
      const isAdmin = this.admin();
      return (
          <AvailablePermissionsProvider level={level}>
              {(props) => {
                  const { permissions, isLoading } = props;
                  return (isLoading || !permissions || !entityPermissions ? <div className="text-center"><Loader/></div>
                      : (
                          <div>
                              <div className="list-item">
                                  <Row>
                                      <Flex>
                                          <bold>
                                              Administrator
                                          </bold>
                                          <div className="list-item-footer faint">
                                              This will grant all of the following permissions.
                                          </div>
                                      </Flex>
                                      <Switch onChange={this.toggleAdmin} checked={isAdmin}/>
                                  </Row>
                              </div>
                              <div className="panel--grey">
                                  <PanelSearch
                                    title="Permissions"
                                    className="no-pad"
                                    items={permissions}
                                    filterRow={(p, search) => {
                                        const strToSearch = Format.enumeration.get(p.key);
                                        return strToSearch.toLowerCase().indexOf(search.toLowerCase()) !== -1;
                                    }}
                                    renderRow={p => (
                                        <div key={p.key} style={this.admin() ? { opacity: 0.5 } : null} className="list-item">
                                            <Row>
                                                <Flex>
                                                    <bold>
                                                        {Format.enumeration.get(p.key)}
                                                    </bold>
                                                    <div className="list-item-footer faint">
                                                        {p.description}
                                                    </div>
                                                </Flex>
                                                <Switch onChange={() => this.togglePermission(p.key)} disabled={this.admin()} checked={this.hasPermission(p.key)}/>
                                            </Row>
                                        </div>
                                    )}
                                  />
                              </div>

                              <p className="text-right mt-2">
                                This will edit the permissions for <bold>{this.props.isGroup ? `the ${this.props.name} group` : ` ${this.props.name}`}</bold>.
                              </p>
                              <div className="text-right">
                                  <Button
                                    onClick={this.save} data-test="update-feature-btn" id="update-feature-btn"
                                    disabled={isSaving}
                                  >
                                      {isSaving ? 'Saving' : 'Save'}
                                  </Button>
                              </div>
                          </div>
                      ));
              } }
          </AvailablePermissionsProvider>
      );
  }
}
export default class EditPermissions extends PureComponent {
  static displayName = 'EditPermissions';

  static propTypes = {};

  constructor(props) {
      super(props);
      this.state = { tab: 0 };
      AppActions.getGroups(AccountStore.getOrganisation().id);
  }

  editUserPermissions = (user) => {
      openModal(`Edit ${Format.camelCase(this.props.level)} Permissions`, <EditPermissionsModal
        name={`${user.first_name} ${user.last_name}`}
        id={this.props.id}
        level={this.props.level}
        user={user}
      />);
  }

  editGroupPermissions = (group) => {
      openModal(`Edit ${Format.camelCase(this.props.level)} Permissions`, <EditPermissionsModal
        name={`${group.name}`}
        id={this.props.id}
        isGroup
        level={this.props.level}
        group={group}
      />);
  }

  render() {
      // const { props } = this;
      return (
          <div className="mt-5">
              <h3>
                Manage Permissions
              </h3>
              <p>
                  Bullet Train lets you manage fine-grained permissions for your projects and environments.
                  {' '}
                  <ButtonLink href="https://docs.bullet-train.io/permissions/">Learn about User Roles.</ButtonLink>
              </p>
              <Tabs value={this.state.tab} onChange={tab => this.setState({ tab })}>
                  <TabItem tabLabel="Users">
                      <OrganisationProvider>
                          {({ isLoading, name, projects, usage, users, invites }) => (
                              <div>
                                  {isLoading && <div className="centered-container"><Loader/></div>}
                                  {!isLoading && (
                                  <div>
                                      <FormGroup className="panel no-pad pl-2 pr-2 panel--nested">
                                          <PanelSearch
                                            id="org-members-list"
                                            title="Members"
                                            className="panel--transparent"
                                            items={users}
                                            renderRow={({ id, first_name, last_name, email, role }) => (
                                                <Row
                                                  onClick={() => {
                                                      if (role !== 'ADMIN') {
                                                          this.editUserPermissions({ id, first_name, last_name, email, role });
                                                      }
                                                  }} space className={`list-item${role === 'ADMIN' ? '' : ' clickable'}`}
                                                  key={id}
                                                >
                                                    <div>
                                                        {`${first_name} ${last_name}`}
                                                        {' '}
                                                        {id == AccountStore.getUserId() && '(You)'}
                                                        <div className="list-item-footer faint">
                                                            {email}
                                                        </div>
                                                    </div>
                                                    {role === 'ADMIN' ? (
                                                        <Tooltip html title="Organisation Administrator">
                                                            {'Organisation administrators have all permissions enabled.<br/>To change the role of this user, visit Organisation Settings.'}
                                                        </Tooltip>
                                                    ) : (
                                                        <div className="flex-row">
                                                            <span className="mr-3">Regular User</span>
                                                            <ion style={{ fontSize: 24 }} className="icon--green ion ion-md-settings"/>
                                                        </div>
                                                    )}
                                                </Row>
                                            )}
                                            renderNoResults={(
                                                <div>
                              You have no users in this organisation.
                                                </div>
                          )}
                                            filterRow={(item, search) => {
                                                const strToSearch = `${item.first_name} ${item.last_name} ${item.email}`;
                                                return strToSearch.toLowerCase().indexOf(search.toLowerCase()) !== -1;
                                            }}
                                          />
                                          <div id="select-portal"/>
                                      </FormGroup>
                                  </div>
                                  )}
                              </div>
                          )}
                      </OrganisationProvider>
                  </TabItem>
                  <TabItem tabLabel="Groups">
                      <FormGroup className="panel no-pad pl-2 pr-2 panel--nested">
                          <UserGroupList orgId={AccountStore.getOrganisation().id} onClick={group => this.editGroupPermissions(group)}/>
                      </FormGroup>
                  </TabItem>
              </Tabs>
          </div>
      );
  }
}
