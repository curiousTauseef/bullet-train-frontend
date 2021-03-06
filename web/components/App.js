import React, { Component } from 'react';
import { matchPath } from 'react-router';
import { withRouter } from 'react-router-dom';
import Aside from './Aside';
import Popover from './base/Popover';
import Feedback from './modals/Feedback';
import PaymentModal from './modals/Payment';
import AlertBar from './AlertBar';
import TwoFactorPrompt from './SimpleTwoFactor/prompt';
import Maintenance from './Maintenance';
import AppLoader from './AppLoader';

const App = class extends Component {
    static propTypes = {
        children: propTypes.element.isRequired,
    };

    static contextTypes = {
        router: propTypes.object.isRequired,
    };

    state = {
        asideIsVisible: !isMobile,
        pin: '',
    }

    constructor(props, context) {
        super(props, context);
    }

    componentDidMount = () => {
        window.addEventListener('scroll', this.handleScroll);
    };

    componentWillReceiveProps(nextProps) {
        if (this.props.location.pathname !== nextProps.location.pathname) {
            if (isMobile) {
                this.setState({ asideIsVisible: false });
            }
            this.hideMobileNav();
        }
    }

    hideMobileNav = () => {
        if (this.mobileNav && this.mobileNav.isActive()) {
            this.mobileNav.toggle();
        }
    }

    toggleAside = () => {
        this.setState({ asideIsVisible: !this.state.asideIsVisible });
    }

    onLogin = () => {
        let { redirect } = Utils.fromParam();
        const invite = API.getInvite();
        if (invite) {
            redirect = `/invite/${invite}`;
        }

        const referrer = API.getReferrer();
        let query = '';
        if (referrer) {
            query = `?${Utils.toParam(referrer)}`;
        }

        if (AccountStore.ephemeral_token) {
            this.forceUpdate();
            return;
        }

        if (!AccountStore.getOrganisation() && document.location.href.indexOf('invite') == -1) { // If user has no organisation redirect to /create
            this.context.router.history.replace(`/create${query}`);
            return;
        }

        // Redirect on login
        if (this.props.location.pathname == '/' || this.props.location.pathname.includes('/oauth') || this.props.location.pathname == '/login' || this.props.location.pathname == '/demo' || this.props.location.pathname == '/signup') {
            if (redirect) {
                this.context.router.history.replace(redirect);
            } else {
                AsyncStorage.getItem('lastEnv')
                    .then((res) => {
                        if (res) {
                            const lastEnv = JSON.parse(res);
                            const lastOrg = _.find(AccountStore.getUser().organisations, { id: lastEnv.orgId });
                            if (!lastOrg) {
                                this.context.router.history.replace('/projects');
                                return;
                            }

                            const org = AccountStore.getOrganisation();
                            if (!org || org.id !== lastOrg.id) {
                                AppActions.selectOrganisation(lastOrg.id);
                                AppActions.getOrganisation(lastOrg.id);
                            }

                            this.context.router.history.replace(`/project/${lastEnv.projectId}/environment/${lastEnv.environmentId}/features`);
                            return;
                        }

                        this.context.router.history.replace('/projects');
                    });
            }
        }
    };

    handleScroll = () => {
        if (this.scrollPos < 768 && $(document).scrollTop() >= 768) {
            this.setState({ myClassName: 'scrolled' });
        } else if (this.scrollPos >= 768 && $(document).scrollTop() < 768) {
            this.setState({ myClassName: '' });
        }
        this.scrollPos = $(document).scrollTop();
    }

    onLogout = () => {
        this.context.router.history.replace('/');
    };

    feedback = () => {
        openModal('Feedback', <Feedback />);
    }

    render() {
        const { hasFeature, getValue, match: { params }, location } = this.props;
        const pathname = location.pathname;
        const { asideIsVisible } = this.state;
        const match = matchPath(pathname, {
            path: '/project/:projectId/environment/:environmentId',
            exact: false,
            strict: false,
        });
        const match2 = matchPath(pathname, {
            path: '/project/:projectId',
            exact: false,
            strict: false,
        });
        const projectId = _.get(match, 'params.projectId') || _.get(match2, 'params.projectId');
        const environmentId = _.get(match, 'params.environmentId');
        const pageHasAside = environmentId || projectId;
        const isHomepage = pathname == '/' || pathname == '/login';
        const isLegal = pathname == '/legal/tos' || pathname == '/legal/sla' || pathname == '/legal/privacy-policy';
        const isDark = /* pathname.indexOf('/blog') !== -1 */ true;

        const redirect = Utils.fromParam().redirect ? `?redirect=${Utils.fromParam().redirect}` : '';
        if (Project.maintenance || this.props.error) {
            return (
                <Maintenance/>
            );
        }
        if (this.props.isLoading) {
            return (
                <AppLoader/>
            );
        }
        return (
            <div>
                <AccountProvider onNoUser={this.onNoUser} onLogout={this.onLogout} onLogin={this.onLogin}>
                    {({ isLoading, isSaving, user, organisation }, { twoFactorLogin }) => (user && user.twoFactorPrompt ? (
                        <div className="col-md-6 push-md-3 mt-5">
                            <TwoFactorPrompt
                              pin={this.state.pin}
                              error={this.state.error}
                              onSubmit={() => {
                                  this.setState({ error: false });
                                  twoFactorLogin(this.state.pin, () => {
                                      this.setState({ error: true });
                                  });
                              }}
                              isLoading={isSaving}
                              onChange={e => this.setState({ pin: Utils.safeParseEventValue(e) })}
                            />
                        </div>
                    ) : (
                        <div>
                            {AccountStore.isDemo && (
                            <AlertBar className="pulse">
                                <div>
                                            You are using a demo account. Finding this useful?
                                    {' '}
                                    <Link onClick={() => AppActions.setUser(null)} to="/">
Click here to Sign
                                                up
                                    </Link>
                                </div>
                            </AlertBar>
                            )}
                            <div className={pageHasAside ? `aside-body${isMobile && !asideIsVisible ? '-full-width' : ''}` : ''}>
                                {(!isHomepage && !pageHasAside || !asideIsVisible || !isMobile) && (
                                    <nav
                                      className={`navbar navbar-fixed-top ${pageHasAside && asideIsVisible ? ' light-header' : ''}${isLegal ? ' dark-header ' : ''}${isDark ? ' dark-header ' : ''}${this.state.myClassName ? this.state.myClassName : ''}`}
                                    >
                                        <Row space>
                                            <div className="navbar-left">
                                                <div className="navbar-nav">
                                                    {pageHasAside && !asideIsVisible && (
                                                    <div role="button" className="clickable toggle" onClick={this.toggleAside}>
                                                        <span className="icon ion-md-menu"/>
                                                    </div>
                                                    )}
                                                    {!projectId && (isLegal ? null : (
                                                        <a href={user ? '/projects' : 'https://bullet-train.io'}>
                                                            {isHomepage || isDark ? (
                                                                <img
                                                                  title="Bullet Train" height={24}
                                                                  src="/images/bullet-train-1.svg"
                                                                  className="brand" alt="Bullet Train logo"
                                                                />)
                                                                : (
                                                                    <img
                                                                      title="Bullet Train" height={24}
                                                                      src="/images/bullet-train-black.svg"
                                                                      className="brand" alt="Bullet Train logo"
                                                                    />
                                                                ) }
                                                        </a>
                                                    )
                                                    )}
                                                </div>
                                            </div>
                                            <div className="navbar-right">
                                                {user ? (
                                                    <React.Fragment>
                                                        <nav className="my-2 my-md-0 hidden-xs-down">
                                                            <a
                                                              href="https://docs.bullet-train.io"
                                                              target="_blank" className="nav-link p-2"
                                                            >
                                                                <img className="mr-2" src="/images/icons/aside/documentation.svg"/>
                                                                Documentation
                                                            </a>
                                                            <a
                                                              href="https://product-hub.io/roadmap/5d81f2406180537538d99f28"
                                                              target="_blank" className="nav-link p-2"
                                                            >
                                                                <img className="mr-2" src="/images/icons/aside/roadmap.svg"/>
                                                                Product Roadmap
                                                            </a>
                                                            <NavLink
                                                              id="account-settings-link"
                                                              activeClassName="active"
                                                              className="nav-link p-2"
                                                              to={projectId ? `/project/${projectId}/environment/${environmentId}/account` : '/account'}
                                                            >
                                                                <img className="mr-2" src="/images/icons/aside/user.svg"/>
                                                                Account Settings
                                                            </NavLink>
                                                        </nav>

                                                        <div className="flex-column org-nav">
                                                            <Popover
                                                              className="popover-right"
                                                              contentClassName="popover-bt"
                                                              renderTitle={toggle => (
                                                                  <a className="nav-link" id="org-menu" onClick={toggle}>
                                                                      {organisation ? organisation.name : ''}
                                                                      <div
                                                                        className="flex-column ion ion-ios-arrow-down"
                                                                      />
                                                                  </a>
                                                              )}
                                                            >
                                                                {toggle => (
                                                                    <div className="popover-inner__content">
                                                                        <span className="popover-bt__title">Organisations</span>
                                                                        {organisation && (
                                                                        <OrganisationSelect
                                                                          clearableValue={false}
                                                                          onChange={(organisation) => {
                                                                              toggle();
                                                                              AppActions.selectOrganisation(organisation.id);
                                                                              AppActions.getOrganisation(organisation.id);
                                                                              this.context.router.history.push('/projects');
                                                                          }}
                                                                        />
                                                                        )}


                                                                        <div className="pl-3 pr-3 mt-2 mb-2">
                                                                            <Link
                                                                              id="create-org-link" onClick={toggle}
                                                                              to="/create"
                                                                            >
                                                                                <Button>

                                                                                Create Organisation <span className="aside__link-icon--white ion-md-add"/>

                                                                                </Button>
                                                                            </Link>
                                                                        </div>

                                                                        <a
                                                                          id="logout-link" href="#"
                                                                          onClick={AppActions.logout}
                                                                          className="popover-bt__list-item"
                                                                        >
                                                                            <img src="/images/icons/aside/logout-dark.svg" className="mr-2" />
                                                                        Logout
                                                                        </a>
                                                                    </div>
                                                                )}
                                                            </Popover>
                                                        </div>
                                                    </React.Fragment>
                                                ) : (
                                                    <div />
                                                )}

                                            </div>
                                        </Row>
                                    </nav>
                                )}
                                {pageHasAside && (
                                <Aside
                                  className={`${AccountStore.isDemo ? 'demo' : ''} ${AccountStore.isDemo ? 'footer' : ''}`}
                                  projectId={projectId}
                                  environmentId={environmentId}
                                  toggleAside={this.toggleAside}
                                  asideIsVisible={asideIsVisible}
                                />
                                )}
                                {isMobile && pageHasAside && asideIsVisible ? null : this.props.children}
                            </div>
                        </div>
                    ))}
                </AccountProvider>

            </div>
        );
    }
};

App.propTypes = {
    location: RequiredObject,
    history: RequiredObject,
};

export default hot(module)(withRouter(ConfigProvider(App)));
